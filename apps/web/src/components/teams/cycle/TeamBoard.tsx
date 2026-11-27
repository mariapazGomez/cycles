import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type * as teamCyclesApi from "../../../services/teamCyclesApi";
import * as routinesApi from "../../../services/routinesApi";
import { dayText, useTeamPlanActions } from "../../../hooks/useTeamPlanActions";
import { cardFacts, teamWeeks, type TeamDay } from "../../../lib/teamCycle";
import { routineBuilderPath } from "../../../lib/library";
import { weekRangeLabel, weekdayShort } from "../../../lib/weekCalendar";
import { Popover } from "../../board/Popover";
import { DayPicker } from "../../board/DayPicker";
import { RoutinePicker } from "../../board/RoutinePicker";
import { RoutinePanel } from "../../board/RoutinePanel";
import { DayCell } from "../../board/DayCell";
import { SaveIndicator } from "../../board/SaveIndicator";
import { UndoToast } from "../../board/UndoToast";
import { SessionMenuButton, TeamSessionActions } from "./TeamSessionActions";

type TeamSession = teamCyclesApi.TeamSession;
type Drag = { kind: "routine"; routine: routinesApi.RoutineDetail } | { kind: "session"; session: TeamSession } | null;
type Pop =
  | { kind: "add"; day: string; anchor: HTMLElement }
  | { kind: "routine"; routine: routinesApi.RoutineDetail; anchor: HTMLElement }
  | { kind: "menu"; session: TeamSession; anchor: HTMLElement }
  | null;

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
  const navigate = useNavigate();
  const routinesQuery = useQuery({ queryKey: ["routines"], queryFn: routinesApi.listRoutines });
  const actions = useTeamPlanActions(today);
  const { status, toast, failure, busy, announce } = actions;
  const [drag, setDrag] = useState<Drag>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [pop, setPop] = useState<Pop>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const readOnly = cycle.status !== "active" || today > cycle.endDate.slice(0, 10);
  const weeks = teamWeeks(cycle, cycle.sessions, today);
  const allDays = weeks
    .map((w) => ({ week: w.week, days: w.days.filter((d) => d.state === "ok").map((d) => d.iso) }))
    .filter((w) => w.days.length > 0);

  function add(routine: routinesApi.RoutineDetail, iso: string) {
    setPop(null);
    setSheetOpen(false);
    actions.add(cycle.id, routine, iso);
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
    else if (current.session.scheduledDate.slice(0, 10) !== target.iso) actions.move(current.session, target.iso);
  }

  function openBuilder(id: "new" | string) {
    navigate(routineBuilderPath(id, `/equipos/${cycle.teamId}/ciclos`));
  }

  const menu = pop?.kind === "menu" ? pop : null;
  return (
    <div className="bd tmc-board">
      {header(<SaveIndicator status={status} />)}
      {failure && (
        <div className="bd-banner bd-banner-err" role="alert">
          <span>{failure}</span>
          <button type="button" className="bd-ghost" onClick={actions.clearFailure}>
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
                                <SessionMenuButton
                                  session={session}
                                  open={menu?.session.id === session.id}
                                  disabled={busy}
                                  onOpen={(anchor) => setPop({ kind: "menu", session, anchor })}
                                />
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

      <TeamSessionActions target={menu ? { cycle, session: menu.session, anchor: menu.anchor } : null} today={today} actions={actions} onClose={() => setPop(null)} />

      <UndoToast toast={toast} onDismiss={() => announce(null)} />
    </div>
  );
}
