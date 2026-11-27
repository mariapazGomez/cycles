import { Fragment, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { TeamAthlete } from "../../services/teamsApi";
import { listTeamEvents } from "../../services/teamEventsApi";
import * as teamCyclesApi from "../../services/teamCyclesApi";
import * as routinesApi from "../../services/routinesApi";
import { limitMessage } from "../../services/queryRetry";
import { useTeamPlanActions, dayText } from "../../hooks/useTeamPlanActions";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { hourLabel, TYPE_COLOR } from "../../lib/teamEvents";
import { calendarWeek, monthGrid, monthOf, monthRange, monthTitle, shiftMonth, startOfWeek, addDays, shortDate, WEEKDAY_SHORT, type CalendarDay } from "../../lib/eventCalendar";
import { gmtLabel } from "../../lib/teamCalendar";
import { activeCycleOn, athleteMarks, bandSegments, crossingCycles, DAY_WHY, dayRule, hasOpenCycle, pickableDays, planBadge, planBlock, planOn, type PlanItem, type TeamMark } from "../../lib/teamPlanCalendar";
import { PANEL_HISTORY, pushPanelHistory, TeamSessionPanel } from "./panel/TeamSessionPanel";
import { routineBuilderPath } from "../../lib/library";
import { initialsOf } from "../../lib/teams";
import { Popover } from "../board/Popover";
import { DayPicker } from "../board/DayPicker";
import { RoutinePicker } from "../board/RoutinePicker";
import { RoutinePanel } from "../board/RoutinePanel";
import { SaveIndicator } from "../board/SaveIndicator";
import { UndoToast } from "../board/UndoToast";
import { PlusIcon } from "../board/icons";
import { SessionMenuButton, TeamSessionActions } from "./cycle/TeamSessionActions";

type Mode = "week" | "month";
type TypeFilter = "all" | "sessions" | "team";
type Drag = { kind: "routine"; routine: routinesApi.RoutineDetail } | ({ kind: "session" } & PlanItem) | null;
type Pop =
  | { kind: "add"; day: string; anchor: HTMLElement }
  | { kind: "routine"; routine: routinesApi.RoutineDetail; anchor: HTMLElement }
  | ({ kind: "menu"; anchor: HTMLElement } & PlanItem)
  | null;

export interface CreatedCycle {
  id: string;
  startDate: string;
}

const WEEK_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];

function Mark({ marks, isToday }: { marks: TeamMark[]; isToday: boolean }) {
  if (marks.length === 0) return <span className="tms-mark tms-mark-none" aria-hidden="true" />;
  const s = marks[0];
  const extra = marks.length > 1 ? ` y ${marks.length - 1} más` : "";
  const label = `${s.name}: ${s.status === "completed" ? "hecha" : s.status === "skipped" ? "omitida" : isToday ? "pendiente, hoy" : "pendiente"}${extra}`;
  const cls = s.status === "completed" ? "tms-mark tms-mark-done" : s.status === "skipped" ? "tms-mark tms-mark-skip" : isToday ? "tms-mark tms-mark-today" : "tms-mark tms-mark-pending";
  return (
    <Link className={cls} to={`/sessions/${s.id}`} aria-label={label} title={label}>
      {s.status === "completed" ? "✓" : s.status === "skipped" ? "✕" : ""}
    </Link>
  );
}

// «del 21 dic al 31 ene 2027»: la fecha no se muestra, pero los lectores de pantalla la oyen.
const cycleDates = (c: { startDate: string; endDate: string }) => `del ${shortDate(c.startDate.slice(0, 10))} al ${shortDate(c.endDate.slice(0, 10))} ${c.endDate.slice(0, 4)}`;

// La barra de cada ciclo sobre los días de una fila. Informativa: no recibe clics ni tapa el
// destino al arrastrar; el nombre y las fechas se leen en el encabezado.
function Band({ cycles, week, lead = 0 }: { cycles: teamCyclesApi.TeamCycleSummary[]; week: string[]; lead?: number }) {
  const segments = bandSegments(cycles, week);
  if (segments.length === 0) return null;
  return (
    <tr className="tcx-bandrow" aria-hidden="true">
      {lead > 0 && <td colSpan={lead} />}
      <td colSpan={7}>
        <div className="tcx-band">
          {segments.map((seg) => (
            <span
              key={seg.cycle.id}
              className={`tcx-bandseg${seg.starts ? " tcx-bandseg-start" : ""}${seg.ends ? " tcx-bandseg-end" : ""}`}
              style={{ gridColumn: `${seg.from} / ${seg.to + 1}` }}
              title={seg.cycle.name}
            >
              {seg.cycle.name}
            </span>
          ))}
        </div>
      </td>
    </tr>
  );
}

// Calendario del equipo: cuadrícula mensual (vista inicial) o semana por atleta. Muestra solo lo
// del equipo (docs/diseno/equipos-ancho-completo): el plan de sus ciclos y sus eventos. Desde aquí
// se planifica arrastrando rutinas o con «+», y cada sesión se abre en un panel lateral.
export function TeamCalendar({
  teamId,
  athletes,
  teamCycles,
  todayIso,
  created,
  onCreatedSeen,
  onNewCycle,
  onViewCycle,
  baseErrors,
  onRetryBase,
}: {
  teamId: string;
  athletes: TeamAthlete[];
  teamCycles: teamCyclesApi.TeamCycleSummary[] | undefined;
  todayIso: string;
  created: CreatedCycle | null;
  onCreatedSeen: () => void;
  onNewCycle: () => void;
  onViewCycle: (cycleId: string) => void;
  // Fallos de lo que pide la página (los ciclos del equipo).
  baseErrors: unknown[];
  onRetryBase: () => void;
}) {
  const navigate = useNavigate();
  const phone = useMediaQuery("(max-width: 720px)");
  // En pantalla angosta el calendario abre por semana, como en el diseño.
  const [mode, setMode] = useState<Mode>(() => (window.matchMedia("(max-width: 760px)").matches ? "week" : "month"));
  const [anchor, setAnchor] = useState(todayIso);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  // La sesión abierta en el panel lateral.
  const [openId, setOpenId] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [pop, setPop] = useState<Pop>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const actions = useTeamPlanActions(todayIso);
  const { announce, busy } = actions;

  // Al crear un ciclo desde aquí, el calendario se mueve a su comienzo y avisa.
  useEffect(() => {
    if (!created) return;
    setAnchor(created.startDate.slice(0, 10));
    announce({ message: `Ciclo creado. Ya puedes ${phone ? "agregar" : "arrastrar"} rutinas a sus días.` });
    onCreatedSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [created]);

  const { year, month } = monthOf(anchor);
  const range = mode === "month" ? monthRange(year, month) : { from: startOfWeek(anchor), to: addDays(startOfWeek(anchor), 6) };
  // Solo lo del equipo: sus eventos y el plan de sus ciclos. Nada de esto crece con los atletas.
  // La clave empieza como la de Eventos, así lo que se guarda allá también renueva esto.
  const eventsQuery = useQuery({ queryKey: ["teams", teamId, "calendar", "equipo", range.from, range.to], queryFn: () => listTeamEvents(teamId, range.from, range.to), staleTime: 60_000 });
  // El plan de cada ciclo del equipo que se ve.
  const summaries = teamCycles ?? [];
  const visibleCycles = crossingCycles(summaries, range.from, range.to);
  const planIdsShown = visibleCycles.map((c) => c.id).join();
  const plansQuery = useQuery({
    queryKey: ["team-cycles", "range", teamId, range.from, range.to, planIdsShown],
    queryFn: () => teamCyclesApi.getTeamCycleDetails(teamId, range.from, range.to, todayIso),
    enabled: visibleCycles.length > 0,
  });
  const details = visibleCycles.length > 0 ? (plansQuery.data ?? []) : [];
  const planReady = teamCycles !== undefined && (visibleCycles.length === 0 || plansQuery.data !== undefined);
  const routinesQuery = useQuery({ queryKey: ["routines"], queryFn: routinesApi.listRoutines });

  const loading = eventsQuery.isLoading || !planReady;
  // Ningún fallo deja huecos sin avisar: lo que no llegó se dice y se puede volver a pedir.
  const queries = [eventsQuery, plansQuery];
  const errors = [...baseErrors, ...queries.flatMap((q) => (q.error ? [q.error] : []))];
  const failed = errors.length > 0;
  const retry = () => {
    onRetryBase();
    queries.filter((q) => q.isError).forEach((q) => void q.refetch());
  };
  const teamEvents = eventsQuery.data ?? [];
  // El filtro solo existe en el mes.
  const showSessions = mode === "week" || typeFilter === "all" || typeFilter === "sessions";
  const showTeamEvents = typeFilter === "all" || typeFilter === "team";

  const block = planBlock({ mode, typeFilter });
  const open = hasOpenCycle(summaries, todayIso);
  const canEdit = teamCycles !== undefined && !block && open;
  const canDrag = canEdit && !phone && !busy;

  function move(delta: number) {
    if (mode === "week") return setAnchor(addDays(anchor, delta * 7));
    const next = shiftMonth(year, month, delta);
    setAnchor(`${next.year}-${String(next.month).padStart(2, "0")}-01`);
  }

  function add(routine: routinesApi.RoutineDetail, iso: string) {
    setPop(null);
    setSheetOpen(false);
    const cycle = activeCycleOn(summaries, iso);
    if (cycle) actions.add(cycle.id, routine, iso);
  }

  function openSession(sessionId: string) {
    setPop(null);
    announce(null);
    actions.clearFailure();
    if (!window.history.state?.[PANEL_HISTORY]) pushPanelHistory();
    setOpenId(sessionId);
  }

  const opened = openId ? details.flatMap((cycle) => cycle.sessions.map((session) => ({ cycle, session }))).find((x) => x.session.id === openId) : undefined;

  function endDrag() {
    setDrag(null);
    setHover(null);
  }

  // Por qué no se puede soltar lo que se arrastra en ese día; null si se puede.
  function dropWhy(iso: string): string | null {
    const rule = dayRule(summaries, iso, todayIso);
    if (rule !== "ok") return DAY_WHY[rule];
    // Una sesión solo se mueve dentro de su ciclo.
    return drag?.kind === "session" && activeCycleOn(summaries, iso)?.id !== drag.cycle.id ? "Fuera del ciclo" : null;
  }

  function dropProps(iso: string) {
    return {
      onDragOver: (e: React.DragEvent) => {
        if (!drag) return;
        setHover(iso);
        if (!dropWhy(iso)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = drag.kind === "routine" ? ("copy" as const) : ("move" as const);
        }
      },
      onDragLeave: (e: React.DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHover((h) => (h === iso ? null : h));
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        const current = drag;
        const why = dropWhy(iso);
        endDrag();
        if (!current || why || !canDrag) return;
        if (current.kind === "routine") add(current.routine, iso);
        else if (current.session.scheduledDate.slice(0, 10) !== iso) actions.move(current.session, iso);
      },
    };
  }

  function dayClass(iso: string): string {
    return drag !== null && hover === iso ? (dropWhy(iso) ? "tcx-bad" : "tcx-ok") : "";
  }

  const dropLabel = (iso: string) => (drag !== null && hover === iso ? <span className="tcx-why">{dropWhy(iso) ?? "Soltar aquí"}</span> : null);

  const plusButton = (iso: string) =>
    canEdit && dayRule(summaries, iso, todayIso) === "ok" ? (
      <button
        type="button"
        className="bd-plus"
        aria-haspopup="dialog"
        aria-expanded={pop?.kind === "add" && pop.day === iso}
        aria-label={`Asignar rutina el ${dayText(iso)}`}
        disabled={busy}
        onClick={(e) => setPop({ kind: "add", day: iso, anchor: e.currentTarget })}
      >
        <PlusIcon />
      </button>
    ) : null;

  const planCards = (iso: string) =>
    showSessions
      ? planOn(details, iso).map(({ cycle, session }) => {
          const badge = planBadge(session, todayIso);
          const editable = canEdit && cycle.status === "active" && todayIso <= cycle.endDate.slice(0, 10);
          const draggable = editable && canDrag && iso >= todayIso;
          return (
            <div
              key={session.id}
              className="tms-card tcx-ses"
              draggable={draggable}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", session.name);
                setDrag({ kind: "session", cycle, session });
              }}
              onDragEnd={endDrag}
            >
              <button type="button" className="tcx-open" aria-haspopup="dialog" onClick={() => openSession(session.id)}>
                <span className="tms-card-name" title={session.name}>
                  {session.name}
                </span>
                <span className={`tms-pill tms-pill-${badge.tone}`}>{badge.text}</span>
                {session.adjusted > 0 && <span className="tmc-tag tmc-tag-warn">{session.adjusted === 1 ? "1 ajustada" : `${session.adjusted} ajustadas`}</span>}
              </button>
              {editable && (
                <SessionMenuButton
                  session={session}
                  open={pop?.kind === "menu" && pop.session.id === session.id}
                  disabled={busy}
                  onOpen={(anchorEl) => setPop({ kind: "menu", cycle, session, anchor: anchorEl })}
                />
              )}
            </div>
          );
        })
      : [];

  const week = calendarWeek(anchor);
  const title = mode === "month" ? monthTitle(year, month) : `Semana del ${shortDate(week[0].iso)} al ${shortDate(week[6].iso)}`;
  const menu = pop?.kind === "menu" ? pop : null;

  return (
    <>
      {failed && (
        <div className="error-banner" role="alert">
          Parte del calendario no se pudo cargar. {limitMessage(errors)}{" "}
          <button type="button" className="tour-link" onClick={retry}>
            Reintentar
          </button>
        </div>
      )}

      <div className="bd tmc-board tcx-board">
        {actions.failure && (
          <div className="bd-banner bd-banner-err" role="alert">
            <span>{actions.failure}</span>
            <button type="button" className="bd-ghost" onClick={actions.clearFailure}>
              Cerrar
            </button>
          </div>
        )}
        <div className="bd-bar tcx-bar">
          <span className="bd-grow" />
          <button type="button" className="bd-btn bd-rail-toggle" onClick={() => setSheetOpen(true)}>
            Rutinas
          </button>
        </div>

        <div className="bd-layout">
          <div className="bd-main">
            <section className="tms-cal" aria-label="Calendario del equipo" aria-busy={loading}>
              <div className="tms-cal-bar">
                <h2 className="tms-cal-title" aria-live="polite">
                  {title.charAt(0).toUpperCase() + title.slice(1)}
                  {mode === "month" && <small> ({gmtLabel(new Date().getTimezoneOffset())})</small>}
                </h2>
                <div className="tms-cal-tools">
                  <button type="button" className="tms-btn" onClick={() => setAnchor(todayIso)}>
                    Hoy
                  </button>
                  <span className="tcx-arrows">
                    <button type="button" className="tms-btn" aria-label={mode === "month" ? "Mes anterior" : "Semana anterior"} onClick={() => move(-1)}>
                      ‹
                    </button>
                    <button type="button" className="tms-btn" aria-label={mode === "month" ? "Mes siguiente" : "Semana siguiente"} onClick={() => move(1)}>
                      ›
                    </button>
                  </span>
                  {mode === "month" && (
                    <div className="tms-filters">
                      <label className="sr-only" htmlFor="tms-type">
                        Tipo
                      </label>
                      <select id="tms-type" className="tms-filter" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}>
                        <option value="all">Todos los tipos</option>
                        <option value="sessions">Sesiones</option>
                        <option value="team">Eventos del equipo</option>
                      </select>
                    </div>
                  )}
                  <SaveIndicator status={actions.status} />
                  <div className="tms-seg" role="group" aria-label="Vista">
                    <button type="button" aria-pressed={mode === "week"} onClick={() => setMode("week")}>
                      Semana
                    </button>
                    <button type="button" aria-pressed={mode === "month"} onClick={() => setMode("month")}>
                      Mes
                    </button>
                  </div>
                </div>
              </div>

              {teamCycles && teamCycles.length === 0 && (
                <div className="tcx-empty">
                  <span>Este equipo aún no tiene ciclo. Créalo para poner rutinas en el calendario.</span>
                  <button type="button" className="tms-primary" onClick={onNewCycle}>
                    Agregar ciclo
                  </button>
                </div>
              )}
              {visibleCycles.length > 0 && (
                <div className="tcx-cycle">
                  {visibleCycles.map((cycle) => (
                    <button key={cycle.id} type="button" className="tcx-name" aria-label={`Ciclo ${cycle.name}, ${cycleDates(cycle)}`} title={cycle.name} onClick={() => onViewCycle(cycle.id)}>
                      {cycle.name}
                    </button>
                  ))}
                </div>
              )}

              {mode === "month" ? (
                <table className="tms-month">
                  <thead>
                    <tr>
                      {WEEKDAY_SHORT.map((d) => (
                        <th key={d} scope="col">
                          {d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {monthGrid(year, month).map((row) => (
                      <Fragment key={row[0].iso}>
                      <Band cycles={summaries} week={row.map((d) => d.iso)} />
                      <tr>
                        {row.map((day: CalendarDay) => {
                          const isToday = day.iso === todayIso;
                          const inMonth = day.inMonth;
                          const own = showTeamEvents && inMonth ? teamEvents.filter((e) => e.date === day.iso) : [];
                          return (
                            <td key={day.iso} className={inMonth ? dayClass(day.iso) : "tms-out"} {...(inMonth ? dropProps(day.iso) : {})}>
                              <div className="tcx-top">
                                {inMonth && plusButton(day.iso)}
                                <div className="tms-daynum">
                                  {isToday ? (
                                    <>
                                      Hoy <b>{day.day}</b>
                                    </>
                                  ) : (
                                    day.day
                                  )}
                                </div>
                              </div>
                              {inMonth && planCards(day.iso)}
                              {own.map((event) => (
                                <Link key={event.seriesId} className="tms-card" to={`/equipos/${teamId}/eventos?semana=${event.date}`} title={`${event.title}: ${hourLabel(event)}`}>
                                  <span className="tms-card-name">
                                    <i aria-hidden="true" style={{ background: TYPE_COLOR[event.type] }} />
                                    {event.title}
                                  </span>
                                  <span className="tms-pill tme-pill-team">Equipo</span>
                                </Link>
                              ))}
                              {inMonth && dropLabel(day.iso)}
                            </td>
                          );
                        })}
                      </tr>
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              ) : (
                <>
                  {phone && (
                    <>
                      <h3 className="tcx-h">Plan del equipo</h3>
                      <ul className="tcx-list">
                        {week.map((d, i) => {
                          const cards = planCards(d.iso);
                          const rule = dayRule(summaries, d.iso, todayIso);
                          return (
                            <li key={d.iso}>
                              <b>
                                {WEEKDAY_SHORT[i]} {d.day}
                              </b>
                              <div>{cards.length > 0 ? cards : <span className="tcx-own">{rule === "ok" ? "Sin sesión" : DAY_WHY[rule]}</span>}</div>
                              {plusButton(d.iso) ?? <span />}
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                  <table className="tms-week">
                    <thead>
                      <tr>
                        <th scope="col">Atleta</th>
                        {week.map((d, i) => (
                          <th key={d.iso} scope="col" title={`${WEEKDAY_SHORT[i]} ${d.day}`}>
                            {phone ? WEEK_LETTERS[i] : `${WEEKDAY_SHORT[i]} ${d.day}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {!phone && <Band cycles={summaries} week={week.map((d) => d.iso)} lead={1} />}
                      {!phone && (
                        <tr className="tcx-plan">
                          <th scope="row">Plan del equipo</th>
                          {week.map((d) => (
                            <td key={d.iso} className={dayClass(d.iso)} {...dropProps(d.iso)}>
                              <div className="tcx-top">{plusButton(d.iso)}</div>
                              {planCards(d.iso)}
                              {dropLabel(d.iso)}
                            </td>
                          ))}
                        </tr>
                      )}
                      {athletes.map((a) => (
                        <tr key={a.id}>
                          <th scope="row">
                            <Link className="tm-athlete" to={`/athletes/${a.id}`}>
                              <span className="hm-avatar hm-avatar-sm" aria-hidden="true">
                                {initialsOf(a.name)}
                              </span>
                              <span>{a.name}</span>
                            </Link>
                          </th>
                          {week.map((d) => (
                            <td key={d.iso}>
                              <Mark marks={athleteMarks(details, a.id, d.iso)} isToday={d.iso === todayIso} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </section>
          </div>

          {sheetOpen && <div className="bd-scrim" onClick={() => setSheetOpen(false)} />}
          <aside className={`bd-rail${sheetOpen ? " bd-rail-open" : ""}`} aria-label="Rutinas">
            {sheetOpen && (
              <button type="button" className="bd-ghost bd-rail-close" onClick={() => setSheetOpen(false)}>
                Cerrar
              </button>
            )}
            {block ? (
              <>
                <header className="bd-rail-head">
                  <h2>Rutinas</h2>
                </header>
                <p className="tcx-note">{block}</p>
              </>
            ) : (
              <RoutinePanel
                routines={routinesQuery.data}
                isLoading={routinesQuery.isLoading}
                isError={routinesQuery.isError}
                disabled={!canEdit || busy}
                note={teamCycles && !open ? "Crea un ciclo del equipo para poder asignarlas." : null}
                draggingId={drag?.kind === "routine" ? drag.routine.id : null}
                onRetry={() => routinesQuery.refetch()}
                onOpenBuilder={(routine) => navigate(routineBuilderPath(routine?.id ?? "new", `/equipos/${teamId}/calendario`))}
                onActivate={(routine, anchorEl) => setPop({ kind: "routine", routine, anchor: anchorEl })}
                onDragStart={(routine) => {
                  setSheetOpen(false);
                  setDrag({ kind: "routine", routine });
                }}
                onDragEnd={endDrag}
              />
            )}
          </aside>
        </div>

        {pop?.kind === "add" && (
          <Popover anchor={pop.anchor} label={`Asignar rutina el ${dayText(pop.day)}`} onClose={() => setPop(null)}>
            <h3 className="bd-pop-title">Asignar el {dayText(pop.day)}</h3>
            <RoutinePicker routines={routinesQuery.data} onPick={(routine) => add(routine, pop.day)} onCreate={() => navigate(routineBuilderPath("new", `/equipos/${teamId}/calendario`))} />
          </Popover>
        )}
        {pop?.kind === "routine" && (
          <Popover anchor={pop.anchor} label={`Agregar ${pop.routine.name}`} onClose={() => setPop(null)}>
            <DayPicker label={`Agregar «${pop.routine.name}» el…`} confirmLabel="Agregar" options={pickableDays(summaries, todayIso)} onPick={(iso) => add(pop.routine, iso)} onCancel={() => setPop(null)} />
          </Popover>
        )}
        <TeamSessionActions target={menu ? { cycle: menu.cycle, session: menu.session, anchor: menu.anchor } : null} today={todayIso} actions={actions} onView={(target) => openSession(target.session.id)} onClose={() => setPop(null)} />
        {!opened && <UndoToast toast={actions.toast} onDismiss={() => announce(null)} />}
        {opened && <TeamSessionPanel key={opened.session.id} cycle={opened.cycle} session={opened.session} today={todayIso} actions={actions} onClosed={() => setOpenId(null)} />}
      </div>
      {athletes.length === 0 && <p className="rm-note">Este equipo todavía no tiene atletas. Agrégalos desde el botón de atletas.</p>}
    </>
  );
}
