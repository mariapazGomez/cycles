import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TrainingCycle, TrainingSession } from "@cycles/shared";
import * as sessionsApi from "../../services/sessionsApi";
import * as cyclesApi from "../../services/cyclesApi";
import { ApiError } from "../../services/httpClient";
import * as routinesApi from "../../services/routinesApi";
import * as trackingApi from "../../services/trackingApi";
import { useBoardActions } from "../../hooks/useBoardActions";
import { buildWeeks, canMove, canRemove, currentDayOf, isTentative, validDaysByWeek, type BoardDay } from "../../lib/board";
import { toLocalDay } from "../../lib/calendar";
import { addDays, dayOfMonth, shortDate, weekRangeLabel, weekdayShort } from "../../lib/weekCalendar";
import { AttentionList, useDismissedAlerts } from "../AttentionList";
import { PlanCalendarSkeleton } from "../Skeleton";
import { CheckBadge } from "../CheckBadge";
import { Popover } from "./Popover";
import { DayPicker } from "./DayPicker";
import { RoutinePicker } from "./RoutinePicker";
import { RoutinePanel } from "./RoutinePanel";
import { SessionCard } from "./SessionCard";
import { DayCell } from "./DayCell";
import { SaveIndicator } from "./SaveIndicator";
import { UndoToast } from "./UndoToast";
import { RoutineDrawer } from "./RoutineDrawer";
import { CopyIcon, MoveIcon, TrashIcon } from "./icons";

type Drag = { kind: "routine"; routine: routinesApi.RoutineDetail } | { kind: "session"; session: TrainingSession } | null;

type Pop =
  | { kind: "add"; day: string; anchor: HTMLElement }
  | { kind: "routine"; routine: routinesApi.RoutineDetail; anchor: HTMLElement }
  | { kind: "menu"; session: TrainingSession; anchor: HTMLElement; step: "menu" | "move" | "duplicate" }
  | null;

function dayText(iso: string): string {
  return `${weekdayShort(iso)} ${dayOfMonth(iso)}`;
}

// Pizarra del ciclo (docs/diseno/ciclos-pizarra, variante A): el calendario es el
// centro y se edita ahí mismo. El coach arrastra rutinas a los días, mueve,
// duplica y quita sesiones; cada gesto se guarda solo y se puede deshacer.
export function CycleBoard({ cycle, athlete }: { cycle: TrainingCycle; athlete: { id: string; name: string } | null }) {
  const queryClient = useQueryClient();
  const sessionsQuery = useQuery({
    queryKey: ["cycles", cycle.id, "sessions"],
    queryFn: () => sessionsApi.listSessions(cycle.id),
  });
  const routinesQuery = useQuery({ queryKey: ["routines"], queryFn: routinesApi.listRoutines });
  // Lo que el atleta registró en cada sesión (esfuerzo, minutos, dolor).
  const progressQuery = useQuery({
    queryKey: ["cycles", cycle.id, "progress"],
    queryFn: () => trackingApi.getCycleProgress(cycle.id),
  });
  const attentionQuery = useQuery({ queryKey: ["attention"], queryFn: trackingApi.getAttention });
  const { isDismissed, dismiss } = useDismissedAlerts();
  const [applied, setApplied] = useState<string | null>(null);

  const today = toLocalDay(new Date());
  const range = useMemo(
    () => ({ startDate: cycle.startDate.slice(0, 10), endDate: cycle.endDate.slice(0, 10), today }),
    [cycle.startDate, cycle.endDate, today],
  );
  const actions = useBoardActions(cycle.id, range);

  const sessions = sessionsQuery.data ?? [];
  const weeks = useMemo(() => buildWeeks(cycle, sessions, today), [cycle, sessions, today]);
  const progressById = new Map((progressQuery.data?.sessions ?? []).map((p) => [p.id, p]));
  const readOnly = cycle.status !== "active";
  const ended = cycle.status === "active" && today > cycle.endDate.slice(0, 10);
  const planAlerts = (attentionQuery.data ?? []).filter(
    (item) => item.cycle.id === cycle.id && item.kind !== "low_adherence" && !isDismissed(item),
  );

  const [drag, setDrag] = useState<Drag>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [pop, setPop] = useState<Pop>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Cajón de crear o editar una rutina; `routine` nulo = crear.
  const [drawer, setDrawer] = useState<{ routine: routinesApi.RoutineDetail | null } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 6_000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  // Al asignar la primera sesión del plan, un mensaje dice que el atleta ya puede entrenar.
  const [readyNotice, setReadyNotice] = useState(false);
  const hadSessions = sessions.length > 0;
  useEffect(() => {
    if (!readyNotice) return;
    const timer = window.setTimeout(() => setReadyNotice(false), 10_000);
    return () => window.clearTimeout(timer);
  }, [readyNotice]);

  const [cycleError, setCycleError] = useState<string | null>(null);
  const cycleMutation = useMutation({
    mutationFn: (data: Parameters<typeof cyclesApi.updateCycle>[1]) => cyclesApi.updateCycle(cycle.id, data),
    onError: (e: unknown) => setCycleError(e instanceof ApiError ? e.message : "No se pudo actualizar el ciclo."),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["cycles"] }),
  });

  // «Agregar una semana»: mueve el fin del ciclo 7 días. Deshacer lo devuelve.
  function addWeek() {
    setCycleError(null);
    const previous = cycle.endDate.slice(0, 10);
    const next = addDays(previous, 7);
    cycleMutation.mutate(
      { endDate: next },
      {
        onSuccess: () =>
          actions.announce({
            message: `El ciclo ahora termina el ${shortDate(next)}.`,
            undo: () => cycleMutation.mutate({ endDate: previous }),
          }),
      },
    );
  }

  function setStatus(status: TrainingCycle["status"], message: string, undoTo?: TrainingCycle["status"]) {
    setCycleError(null);
    cycleMutation.mutate(
      { status },
      {
        onSuccess: () =>
          actions.announce({ message, undo: undoTo ? () => cycleMutation.mutate({ status: undoTo }) : undefined }),
      },
    );
  }

  function endDrag() {
    setDrag(null);
    setHover(null);
  }

  function dropState(day: BoardDay): "ok" | "bad" | null {
    if (!drag || hover !== day.iso) return null;
    return day.state === "ok" ? "ok" : "bad";
  }

  function handleDrop(day: BoardDay) {
    const current = drag;
    endDrag();
    if (!current || day.state !== "ok" || readOnly) return;
    if (current.kind === "routine") {
      if (!hadSessions) setReadyNotice(true);
      void actions.addRoutine(current.routine, day.iso);
    } else if (currentDayOf(current.session) !== day.iso) {
      void actions.moveSession(current.session, day.iso);
    }
  }

  function addRoutineTo(routine: routinesApi.RoutineDetail, dayIso: string) {
    setPop(null);
    setSheetOpen(false);
    if (!hadSessions) setReadyNotice(true);
    void actions.addRoutine(routine, dayIso);
  }

  const sessionPop = pop?.kind === "menu" ? pop : null;
  const currentWeek = weeks.find((w) => w.days.some((d) => d.iso === today))?.week ?? 0;
  const allDays = validDaysByWeek(weeks);

  return (
    <div className="bd">
      {readyNotice && (
        <div className="success-banner" role="status">
          <strong>{athlete ? `${athlete.name} ya puede entrenar.` : "Tu atleta ya puede entrenar."}</strong> Verá este ciclo
          en Hoy y le llegará un aviso en unos minutos.
        </div>
      )}
      {applied && (
        <div className="success-banner" role="status">
          <strong>Ajuste aplicado.</strong> {applied}
        </div>
      )}
      {planAlerts.length > 0 && (
        <section className="hm-card" style={{ marginBottom: 16 }}>
          <AttentionList
            items={planAlerts}
            onDismiss={dismiss}
            onApplied={(message) => {
              setApplied(message);
              queryClient.invalidateQueries({ queryKey: ["cycles", cycle.id, "progress"] });
            }}
          />
        </section>
      )}
      {cycleError && (
        <div className="bd-banner bd-banner-err" role="alert">
          <span>{cycleError}</span>
          <button type="button" className="bd-ghost" onClick={() => setCycleError(null)}>
            Cerrar
          </button>
        </div>
      )}
      {ended && (
        <div className="bd-banner bd-banner-warn" role="status">
          <span>
            El ciclo terminó el {shortDate(range.endDate)}, pero sigue marcado como Activo. Para seguir planificando,
            agrega una semana o márcalo como completado.
          </span>
          <button type="button" className="bd-btn bd-btn-sm" disabled={cycleMutation.isPending} onClick={addWeek}>
            Agregar una semana
          </button>
          <button
            type="button"
            className="bd-btn bd-btn-sm"
            disabled={cycleMutation.isPending}
            onClick={() => setStatus("completed", "Ciclo marcado como completado.", "active")}
          >
            Marcar como completado
          </button>
        </div>
      )}
      {readOnly && (
        <div className="bd-banner bd-banner-info" role="status">
          <span>
            Este ciclo está {cycle.status === "completed" ? "completado" : "archivado"}: solo puedes consultarlo.
          </span>
          <button
            type="button"
            className="bd-btn bd-btn-sm"
            disabled={cycleMutation.isPending}
            onClick={() => setStatus("active", "Ciclo reabierto: ya puedes editar sus sesiones.")}
          >
            {cycle.status === "completed" ? "Reabrir ciclo" : "Reactivar ciclo"}
          </button>
        </div>
      )}
      {actions.failure && (
        <div className="bd-banner bd-banner-err" role="alert">
          <span>{actions.failure.message}</span>
          <button type="button" className="bd-btn bd-btn-sm" onClick={actions.failure.retry}>
            Reintentar
          </button>
          <button type="button" className="bd-ghost" onClick={actions.dismissFailure}>
            Descartar el cambio
          </button>
        </div>
      )}

      <div className="bd-bar">
        <h2>Calendario del ciclo</h2>
        <span className="bd-legend" aria-hidden="true">
          <span>
            <CheckBadge small label="Hecha" /> Hecha
          </span>
          <span>
            <i className="bd-sw" /> Pendiente
          </span>
          <span>
            <i className="bd-sw bd-sw-skip" /> Omitida
          </span>
        </span>
        <span className="bd-grow" />
        <SaveIndicator status={actions.status} />
        {!readOnly && (
          <button type="button" className="bd-btn bd-rail-toggle" onClick={() => setSheetOpen(true)}>
            Rutinas
          </button>
        )}
      </div>

      {!sessionsQuery.isLoading && sessions.length === 0 && !readOnly && weeks.some((w) => w.days.some((d) => d.state === "ok")) && (
        <div className="bd-banner bd-banner-info">
          <span>
            <strong>Ciclo nuevo.</strong> Arrastra una rutina a un día, o usa el «+» de cada día.
          </span>
        </div>
      )}

      <div className={`bd-layout${readOnly ? " bd-layout-ro" : ""}`}>
        <div className="bd-main">
          {sessionsQuery.isError ? (
            <div className="bd-banner bd-banner-err" role="alert">
              <span>No se pudo cargar el calendario.</span>
              <button type="button" className="bd-btn bd-btn-sm" onClick={() => sessionsQuery.refetch()}>
                Reintentar
              </button>
            </div>
          ) : sessionsQuery.isLoading ? (
            <PlanCalendarSkeleton />
          ) : (
            <>
              <div className="bd-gh" aria-hidden="true">
                <span />
                {weeks[0]?.days.map((d) => <span key={d.iso}>{weekdayShort(d.iso)}</span>)}
              </div>
              <ol className="bd-weeks">
                {weeks.map((week) => {
                  const isCurrent = week.week === currentWeek;
                  const doneCount = week.days.reduce((n, d) => n + d.sessions.filter((s) => s.status === "completed").length, 0);
                  const total = week.days.reduce((n, d) => n + d.sessions.length, 0);
                  return (
                    <li key={week.week} className={`bd-wr${isCurrent ? " bd-wr-cur" : ""}`} aria-label={`Semana ${week.week}`}>
                      <div className="bd-wl">
                        <b>Semana {week.week}</b>
                        <small>{weekRangeLabel(week.first)}</small>
                        {isCurrent && <span className="pill pill-blue">Esta semana</span>}
                        {total > 0 && (
                          <span className="bd-wsum">
                            {doneCount} de {total}
                          </span>
                        )}
                      </div>
                      {week.days.map((day) => (
                        <DayCell
                          key={day.iso}
                          day={day}
                          isToday={day.iso === today}
                          readOnly={readOnly}
                          dropState={dropState(day)}
                          plusOpen={pop?.kind === "add" && pop.day === day.iso}
                          onPlus={(button) => setPop({ kind: "add", day: day.iso, anchor: button })}
                          onDragOver={(e) => {
                            if (!drag) return;
                            setHover(day.iso);
                            if (day.state === "ok" && !readOnly) {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = drag.kind === "routine" ? "copy" : "move";
                            }
                          }}
                          onDragLeave={(e) => {
                            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                              setHover((h) => (h === day.iso ? null : h));
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            handleDrop(day);
                          }}
                        >
                          {day.sessions.map((session) => (
                            <SessionCard
                              key={session.id}
                              session={session}
                              progress={progressById.get(session.id)}
                              dayLabel={dayText(day.iso)}
                              tentative={isTentative(range.startDate, session)}
                              saving={actions.savingIds.has(session.id)}
                              dragging={drag?.kind === "session" && drag.session.id === session.id}
                              readOnly={readOnly}
                              menuOpen={sessionPop?.session.id === session.id}
                              onMenu={(button) => setPop({ kind: "menu", session, anchor: button, step: "menu" })}
                              onDragStart={() => setDrag({ kind: "session", session })}
                              onDragEnd={endDrag}
                            />
                          ))}
                        </DayCell>
                      ))}
                    </li>
                  );
                })}
              </ol>
              {!readOnly && !ended && (
                <div className="bd-addweek">
                  <button type="button" className="bd-btn" disabled={cycleMutation.isPending} onClick={addWeek}>
                    Agregar una semana
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {!readOnly && (
          <>
            {sheetOpen && <div className="bd-scrim" onClick={() => setSheetOpen(false)} />}
            <aside className={`bd-rail${sheetOpen ? " bd-rail-open" : ""}`} aria-label="Rutinas">
              {sheetOpen && (
                <button type="button" className="bd-ghost bd-rail-close" onClick={() => setSheetOpen(false)}>
                  Cerrar
                </button>
              )}
              <RoutinePanel
                routines={routinesQuery.data}
                isLoading={routinesQuery.isLoading}
                isError={routinesQuery.isError}
                disabled={readOnly}
                draggingId={drag?.kind === "routine" ? drag.routine.id : null}
                onRetry={() => routinesQuery.refetch()}
                onOpenDrawer={(routine) => {
                  setSheetOpen(false);
                  setDrawer({ routine });
                }}
                onActivate={(routine, anchor) => setPop({ kind: "routine", routine, anchor })}
                onDragStart={(routine) => {
                  setSheetOpen(false);
                  setDrag({ kind: "routine", routine });
                }}
                onDragEnd={endDrag}
              />
            </aside>
          </>
        )}
      </div>

      {pop?.kind === "add" && (
        <Popover anchor={pop.anchor} label={`Asignar rutina el ${dayText(pop.day)}`} onClose={() => setPop(null)}>
          <h3 className="bd-pop-title">Asignar el {dayText(pop.day)}</h3>
          <RoutinePicker routines={routinesQuery.data} onPick={(routine) => addRoutineTo(routine, (pop as { day: string }).day)} />
        </Popover>
      )}

      {pop?.kind === "routine" && (
        <Popover anchor={pop.anchor} label={`Agregar ${pop.routine.name}`} onClose={() => setPop(null)}>
          <DayPicker
            label={`Agregar «${pop.routine.name}» el…`}
            confirmLabel="Agregar"
            options={allDays}
            onPick={(day) => addRoutineTo((pop as { routine: routinesApi.RoutineDetail }).routine, day)}
            onCancel={() => setPop(null)}
          />
        </Popover>
      )}

      {sessionPop && (
        <Popover anchor={sessionPop.anchor} label={`Acciones de ${sessionPop.session.name}`} onClose={() => setPop(null)}>
          {sessionPop.step === "menu" ? (
            <div className="bd-mlist">
              <button
                type="button"
                disabled={!canMove(sessionPop.session)}
                title={canMove(sessionPop.session) ? undefined : "Esta sesión ya tiene el cierre del atleta: no se mueve. Puedes duplicarla o quitarla."}
                onClick={() => setPop({ ...sessionPop, step: "move" })}
              >
                <MoveIcon /> Mover a otro día…
              </button>
              <button type="button" onClick={() => setPop({ ...sessionPop, step: "duplicate" })}>
                <CopyIcon /> Duplicar en otro día…
              </button>
              <button
                type="button"
                className="bd-danger"
                disabled={!canRemove(sessionPop.session)}
                onClick={() => {
                  setPop(null);
                  void actions.removeSession(sessionPop.session);
                }}
              >
                <TrashIcon /> Quitar de este día
              </button>
              {!canMove(sessionPop.session) && (
                <p className="bd-hint">Esta sesión ya tiene el cierre del atleta: no se mueve.</p>
              )}
            </div>
          ) : (
            <DayPicker
              label={sessionPop.step === "move" ? `Mover «${sessionPop.session.name}» al…` : `Duplicar «${sessionPop.session.name}» el…`}
              confirmLabel={sessionPop.step === "move" ? "Mover" : "Duplicar"}
              options={validDaysByWeek(weeks, sessionPop.step === "move" ? currentDayOf(sessionPop.session) : null)}
              onPick={(day) => {
                setPop(null);
                if (sessionPop.step === "move") void actions.moveSession(sessionPop.session, day);
                else void actions.duplicateSession(sessionPop.session, day);
              }}
              onCancel={() => setPop(null)}
            />
          )}
        </Popover>
      )}

      {drawer && (
        <RoutineDrawer
          routine={drawer.routine}
          onClose={() => setDrawer(null)}
          onSaved={(saved, created) => {
            setDrawer(null);
            setNotice(
              created
                ? `«${saved.name}» guardada. Ya está en el panel: arrástrala a un día.`
                : `«${saved.name}» actualizada. Vale para las sesiones que agregues desde ahora.`,
            );
          }}
        />
      )}

      <UndoToast toast={actions.toast ?? (notice ? { message: notice } : null)} onDismiss={() => (actions.toast ? actions.dismissToast() : setNotice(null))} />
    </div>
  );
}
