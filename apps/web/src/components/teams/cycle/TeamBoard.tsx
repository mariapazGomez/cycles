import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as teamCyclesApi from "../../../services/teamCyclesApi";
import * as routinesApi from "../../../services/routinesApi";
import { ApiError } from "../../../services/httpClient";
import type { BoardToast, SaveStatus } from "../../../hooks/useBoardActions";
import { cardFacts, editReach, savedMessage, teamWeeks, type TeamDay } from "../../../lib/teamCycle";
import { routineBuilderPath } from "../../../lib/library";
import { athletesCount } from "../../../lib/teams";
import { dayOfMonth, weekRangeLabel, weekdayName, weekdayShort } from "../../../lib/weekCalendar";
import { Popover } from "../../board/Popover";
import { DayPicker } from "../../board/DayPicker";
import { RoutinePicker } from "../../board/RoutinePicker";
import { RoutinePanel } from "../../board/RoutinePanel";
import { DayCell } from "../../board/DayCell";
import { SaveIndicator } from "../../board/SaveIndicator";
import { UndoToast } from "../../board/UndoToast";
import { CopyIcon, DotsIcon, MoveIcon, TrashIcon } from "../../board/icons";
import { ConfirmDialog } from "./ConfirmDialog";
import { TeamSessionDialog } from "./TeamSessionDialog";

type TeamSession = teamCyclesApi.TeamSession;
type Drag = { kind: "routine"; routine: routinesApi.RoutineDetail } | { kind: "session"; session: TeamSession } | null;
type Pop =
  | { kind: "add"; day: string; anchor: HTMLElement }
  | { kind: "routine"; routine: routinesApi.RoutineDetail; anchor: HTMLElement }
  | { kind: "menu"; session: TeamSession; anchor: HTMLElement; step: "menu" | "move" | "duplicate" }
  | null;

const TOAST_MS = 8_000;
const dayText = (iso: string) => `${weekdayName(iso)} ${dayOfMonth(iso)}`;

// La misma pizarra del ciclo de un atleta, para el plan del equipo: cada gesto se guarda solo y
// llega a los integrantes. Lo registrado y lo ajustado no cambia, y el aviso lo dice.
export function TeamBoard({
  cycle,
  today,
  header,
}: {
  cycle: teamCyclesApi.TeamCycleDetail;
  today: string;
  header: (saving: ReactNode) => ReactNode;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const routinesQuery = useQuery({ queryKey: ["routines"], queryFn: routinesApi.listRoutines });
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [toast, setToast] = useState<BoardToast | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [pop, setPop] = useState<Pop>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<TeamSession | null>(null);
  const [removing, setRemoving] = useState<TeamSession | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const readOnly = cycle.status !== "active" || today > cycle.endDate.slice(0, 10);
  const weeks = teamWeeks(cycle, cycle.sessions, today);
  const allDays = weeks
    .map((w) => ({ week: w.week, days: w.days.filter((d) => d.state === "ok").map((d) => d.iso) }))
    .filter((w) => w.days.length > 0);
  const nameOf = (athleteId: string) => cycle.athletes.find((a) => a.athleteId === athleteId)?.name ?? "un atleta";

  function announce(next: BoardToast | null) {
    window.clearTimeout(timer.current);
    setToast(next);
    if (next) timer.current = window.setTimeout(() => setToast(null), TOAST_MS);
  }

  // Un gesto: se guarda, se vuelve a leer el plan y las fichas, y se avisa qué pasó.
  async function perform<T>(request: () => Promise<T>, done: (result: T) => BoardToast | null, fallback: string) {
    setFailure(null);
    setBusy(true);
    setStatus("saving");
    announce(null);
    try {
      const result = await request();
      setStatus("saved");
      announce(done(result));
    } catch (error) {
      setStatus("error");
      setFailure(error instanceof ApiError ? error.message : fallback);
    } finally {
      setBusy(false);
      await queryClient.invalidateQueries({ queryKey: ["team-cycles", cycle.id] });
      void queryClient.invalidateQueries({ queryKey: ["cycles"] });
    }
  }

  const undoCreated = (sessionId: string) => () =>
    void perform(() => teamCyclesApi.deleteTeamSession(sessionId, today), () => ({ message: "Se deshizo el cambio." }), "No se pudo deshacer.");

  function add(routine: routinesApi.RoutineDetail, iso: string) {
    setPop(null);
    setSheetOpen(false);
    void perform(
      () => teamCyclesApi.addTeamSession(cycle.id, { routineId: routine.id, scheduledDate: iso, today }),
      (r) => ({ message: `«${routine.name}» agregada el ${dayText(iso)}: llega a ${athletesCount(r.delivered)}.`, undo: undoCreated(r.sessionId) }),
      "No se pudo agregar la rutina.",
    );
  }

  function move(session: TeamSession, iso: string) {
    const origin = session.scheduledDate.slice(0, 10);
    void perform(
      () => teamCyclesApi.moveTeamSession(session.id, { scheduledDate: iso, today }),
      (summary) => ({
        message: savedMessage(summary),
        undo:
          origin >= today
            ? () => void perform(() => teamCyclesApi.moveTeamSession(session.id, { scheduledDate: origin, today }), (s) => ({ message: savedMessage(s) }), "No se pudo deshacer.")
            : undefined,
      }),
      "No se pudo mover la sesión.",
    );
  }

  function duplicate(session: TeamSession, iso: string) {
    void perform(
      () => teamCyclesApi.duplicateTeamSession(session.id, { scheduledDate: iso, today }),
      (r) => ({ message: `«${session.name}» duplicada el ${dayText(iso)}: llega a ${athletesCount(r.delivered)}.`, undo: undoCreated(r.sessionId) }),
      "No se pudo duplicar la sesión.",
    );
  }

  function endDrag() {
    setDrag(null);
    setHover(null);
  }

  function handleDrop(target: TeamDay) {
    const current = drag;
    endDrag();
    if (!current || target.state !== "ok" || readOnly || busy) return;
    if (current.kind === "routine") add(current.routine, target.iso);
    else if (current.session.scheduledDate.slice(0, 10) !== target.iso) move(current.session, target.iso);
  }

  function openBuilder(id: "new" | string) {
    navigate(routineBuilderPath(id, `/equipos/${cycle.teamId}/ciclos`));
  }

  const menu = pop?.kind === "menu" ? pop : null;
  // Una sesión de un día pasado no se mueve: su historia ya es la de cada atleta.
  const movable = menu ? menu.session.scheduledDate.slice(0, 10) >= today : false;

  return (
    <div className="bd tmc-board">
      {header(<SaveIndicator status={status} />)}
      {failure && (
        <div className="bd-banner bd-banner-err" role="alert">
          <span>{failure}</span>
          <button type="button" className="bd-ghost" onClick={() => setFailure(null)}>
            Cerrar
          </button>
        </div>
      )}
      <div className="bd-bar">
        <span className="bd-grow" />
        {!readOnly && (
          <button type="button" className="bd-btn bd-rail-toggle" onClick={() => setSheetOpen(true)}>
            Rutinas
          </button>
        )}
      </div>
      <div className={`bd-layout${readOnly ? " bd-layout-ro" : ""}`}>
        <div className="bd-main">
          <div className="bd-gh" aria-hidden="true">
            <span />
            {weeks[0]?.days.map((d) => <span key={d.iso}>{weekdayShort(d.iso)}</span>)}
          </div>
          <ol className="bd-weeks">
            {weeks.map((week) => {
              const isCurrent = week.days.some((d) => d.iso === today);
              return (
                <li key={week.week} className={`bd-wr${isCurrent ? " bd-wr-cur" : ""}`} aria-label={`Semana ${week.week}`}>
                  <div className="bd-wl">
                    <b>Semana {week.week}</b>
                    <small>{weekRangeLabel(week.first)}</small>
                    {isCurrent && <span className="pill pill-blue">Esta semana</span>}
                  </div>
                  {week.days.map((d) => (
                    <DayCell
                      key={d.iso}
                      day={d}
                      isToday={d.iso === today}
                      readOnly={readOnly}
                      dropState={drag && hover === d.iso ? (d.state === "ok" ? "ok" : "bad") : null}
                      plusOpen={pop?.kind === "add" && pop.day === d.iso}
                      onPlus={(button) => setPop({ kind: "add", day: d.iso, anchor: button })}
                      onDragOver={(e) => {
                        if (!drag) return;
                        setHover(d.iso);
                        if (d.state === "ok" && !readOnly) {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = drag.kind === "routine" ? "copy" : "move";
                        }
                      }}
                      onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHover((h) => (h === d.iso ? null : h));
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDrop(d);
                      }}
                    >
                      {d.sessions.map((session) => {
                        const facts = cardFacts(session, today);
                        const draggable = !readOnly && d.state === "ok";
                        return (
                          <div
                            key={session.id}
                            className={`bd-ses tmc-ses${facts.allDone ? " bd-ses-done" : ""}${draggable ? " bd-ses-drag" : ""}`}
                            draggable={draggable}
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = "move";
                              e.dataTransfer.setData("text/plain", session.name);
                              setDrag({ kind: "session", session });
                            }}
                            onDragEnd={endDrag}
                          >
                            <div className="bd-nr">
                              <b className="tmc-ses-name">{session.name}</b>
                              {!readOnly && (
                                <button
                                  type="button"
                                  className="bd-mn"
                                  aria-haspopup="dialog"
                                  aria-expanded={menu?.session.id === session.id}
                                  aria-label={`Acciones de ${session.name}, ${dayText(d.iso)}`}
                                  disabled={busy}
                                  onClick={(e) => setPop({ kind: "menu", session, anchor: e.currentTarget, step: "menu" })}
                                >
                                  <DotsIcon />
                                </button>
                              )}
                            </div>
                            <span className="tmc-facts">{facts.text}</span>
                            {facts.adjusted && <span className="tmc-tag tmc-tag-warn">{facts.adjusted}</span>}
                          </div>
                        );
                      })}
                    </DayCell>
                  ))}
                </li>
              );
            })}
          </ol>
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
                disabled={busy}
                draggingId={drag?.kind === "routine" ? drag.routine.id : null}
                onRetry={() => routinesQuery.refetch()}
                onOpenBuilder={(routine) => openBuilder(routine?.id ?? "new")}
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
          <RoutinePicker routines={routinesQuery.data} onPick={(routine) => add(routine, pop.day)} onCreate={() => openBuilder("new")} />
        </Popover>
      )}

      {pop?.kind === "routine" && (
        <Popover anchor={pop.anchor} label={`Agregar ${pop.routine.name}`} onClose={() => setPop(null)}>
          <DayPicker label={`Agregar «${pop.routine.name}» el…`} confirmLabel="Agregar" options={allDays} onPick={(iso) => add(pop.routine, iso)} onCancel={() => setPop(null)} />
        </Popover>
      )}

      {menu && (
        <Popover anchor={menu.anchor} label={`Acciones de ${menu.session.name}`} onClose={() => setPop(null)}>
          {menu.step === "menu" ? (
            <div className="bd-mlist">
              <button
                type="button"
                onClick={() => {
                  setPop(null);
                  setEditing(menu.session);
                }}
              >
                Editar ejercicios
              </button>
              <button type="button" disabled={!movable} onClick={() => setPop({ ...menu, step: "move" })}>
                <MoveIcon /> Mover a otro día…
              </button>
              <button type="button" onClick={() => setPop({ ...menu, step: "duplicate" })}>
                <CopyIcon /> Duplicar en otro día…
              </button>
              <button
                type="button"
                className="bd-danger"
                onClick={() => {
                  setPop(null);
                  setRemoving(menu.session);
                }}
              >
                <TrashIcon /> Quitar de este día
              </button>
              {!movable && <p className="bd-hint">Es de un día pasado: no se mueve. Puedes duplicarla.</p>}
            </div>
          ) : (
            <DayPicker
              label={menu.step === "move" ? `Mover «${menu.session.name}» al…` : `Duplicar «${menu.session.name}» el…`}
              confirmLabel={menu.step === "move" ? "Mover" : "Duplicar"}
              options={
                menu.step === "move"
                  ? allDays.map((w) => ({ week: w.week, days: w.days.filter((d) => d !== menu.session.scheduledDate.slice(0, 10)) })).filter((w) => w.days.length > 0)
                  : allDays
              }
              onPick={(iso) => {
                setPop(null);
                if (menu.step === "move") move(menu.session, iso);
                else duplicate(menu.session, iso);
              }}
              onCancel={() => setPop(null)}
            />
          )}
        </Popover>
      )}

      {editing && (
        <TeamSessionDialog
          session={editing}
          today={today}
          nameOf={nameOf}
          onClose={() => setEditing(null)}
          onSave={(next, previous) => {
            const id = editing.id;
            setEditing(null);
            void perform(
              () => teamCyclesApi.saveTeamSessionStructure(id, next, today),
              (summary) => ({
                message: savedMessage(summary),
                undo: () => void perform(() => teamCyclesApi.saveTeamSessionStructure(id, previous, today), (s) => ({ message: savedMessage(s) }), "No se pudo deshacer."),
              }),
              "No se pudo guardar la sesión.",
            );
          }}
        />
      )}

      {removing && (
        <ConfirmDialog
          title={`Quitar «${removing.name}» del ${dayText(removing.scheduledDate.slice(0, 10))}`}
          confirmLabel="Quitar de este día"
          busyLabel="Quitando…"
          busy={busy}
          error={null}
          onClose={() => setRemoving(null)}
          onConfirm={() => {
            const session = removing;
            setRemoving(null);
            void perform(() => teamCyclesApi.deleteTeamSession(session.id, today), (summary) => ({ message: savedMessage(summary, "quitada") }), "No se pudo quitar la sesión.");
          }}
        >
          <p>
            Se quita a {athletesCount(editReach(removing, today, nameOf).reach)}. Lo registrado y lo que ajustaste para alguien se conserva. No se puede deshacer.
          </p>
        </ConfirmDialog>
      )}

      <UndoToast toast={toast} onDismiss={() => announce(null)} />
    </div>
  );
}
