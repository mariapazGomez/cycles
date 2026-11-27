import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import type { TeamAthlete } from "../../services/teamsApi";
import type { TrainingCycle } from "@cycles/shared";
import { loadAthleteSessions } from "../../services/boardApi";
import { getTeamCalendar } from "../../services/teamEventsApi";
import * as teamCyclesApi from "../../services/teamCyclesApi";
import * as routinesApi from "../../services/routinesApi";
import { useTeamPlanActions, dayText } from "../../hooks/useTeamPlanActions";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { hourLabel, TYPE_COLOR } from "../../lib/teamEvents";
import { calendarWeek, monthGrid, monthOf, monthRange, monthTitle, shiftMonth, startOfWeek, addDays, shortDate, WEEKDAY_SHORT, type CalendarDay } from "../../lib/eventCalendar";
import { eventLines, gmtLabel, sessionBadge, sessionCards, type MemberEvents, type MemberSessions, type TeamSessionCard } from "../../lib/teamCalendar";
import { activeCycleOn, crossingCycles, cycleReach, DAY_WHY, dayRule, hasOpenCycle, inTeamCycle, ownSessions, pickableDays, planBadge, planBlock, planOn, type PlanItem } from "../../lib/teamPlanCalendar";
import { routineBuilderPath } from "../../lib/library";
import { initialsOf } from "../../lib/teams";
import type { BoardSession } from "../../lib/weekBoard";
import { Popover } from "../board/Popover";
import { DayPicker } from "../board/DayPicker";
import { RoutinePicker } from "../board/RoutinePicker";
import { RoutinePanel } from "../board/RoutinePanel";
import { SaveIndicator } from "../board/SaveIndicator";
import { UndoToast } from "../board/UndoToast";
import { PlusIcon } from "../board/icons";
import { SessionMenuButton, TeamSessionActions } from "./cycle/TeamSessionActions";

type Mode = "week" | "month";
type TypeFilter = "all" | "sessions" | "team" | "events";
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

function Mark({ sessions, isToday }: { sessions: BoardSession[]; isToday: boolean }) {
  if (sessions.length === 0) return <span className="tms-mark tms-mark-none" aria-hidden="true" />;
  const s = sessions[0];
  const extra = sessions.length > 1 ? ` y ${sessions.length - 1} más` : "";
  const label = `${s.name}: ${s.status === "completed" ? "hecha" : s.status === "skipped" ? "omitida" : isToday ? "pendiente, hoy" : "pendiente"}${extra}`;
  const cls = s.status === "completed" ? "tms-mark tms-mark-done" : s.status === "skipped" ? "tms-mark tms-mark-skip" : isToday ? "tms-mark tms-mark-today" : "tms-mark tms-mark-pending";
  return (
    <Link className={cls} to={`/sessions/${s.id}`} aria-label={label} title={label}>
      {s.status === "completed" ? "✓" : s.status === "skipped" ? "✕" : ""}
    </Link>
  );
}

// Calendario del equipo: cuadrícula mensual (vista inicial) o semana por atleta. Desde aquí se
// planifica el ciclo del equipo: las rutinas se arrastran a un día (o con «+») y cada sesión del
// plan dice a cuántos llega o cuántos la hicieron (docs/diseno/calendario-equipo-arrastre). Lo
// que agregaron los atletas va en una línea por tipo (sin sus notas, R7).
export function TeamCalendar({
  teamId,
  athletes,
  cycles,
  teamCycles,
  todayIso,
  created,
  onCreatedSeen,
  onNewCycle,
  onViewCycle,
}: {
  teamId: string;
  athletes: TeamAthlete[];
  cycles: TrainingCycle[];
  teamCycles: teamCyclesApi.TeamCycleSummary[] | undefined;
  todayIso: string;
  created: CreatedCycle | null;
  onCreatedSeen: () => void;
  onNewCycle: () => void;
  onViewCycle: (cycleId: string) => void;
}) {
  const navigate = useNavigate();
  const phone = useMediaQuery("(max-width: 720px)");
  // En pantalla angosta el calendario abre por semana, como en el diseño.
  const [mode, setMode] = useState<Mode>(() => (window.matchMedia("(max-width: 760px)").matches ? "week" : "month"));
  const [anchor, setAnchor] = useState(todayIso);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [personId, setPersonId] = useState("");
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
  // La invitación pendiente todavía no tiene ciclos ni actividades. El filtro de persona es del mes.
  const members = athletes.filter((a) => a.status === "active" && (mode === "week" || personId === "" || a.id === personId));

  const sessionQueries = useQueries({
    queries: members.map((a) => {
      const own = cycles.filter((c) => c.athleteId === a.id);
      return {
        queryKey: ["athletes", a.id, "sessions-range", range.from, range.to, own.map((c) => c.id).join()],
        queryFn: () => loadAthleteSessions(own, range.from, range.to),
        staleTime: 60_000,
      };
    }),
  });
  // Los eventos del equipo y lo que agregaron sus atletas, en una sola consulta (CYC-319).
  const calendarQuery = useQuery({ queryKey: ["teams", teamId, "calendar", range.from, range.to], queryFn: () => getTeamCalendar(teamId, range.from, range.to), staleTime: 60_000 });
  // El plan de cada ciclo del equipo que se ve.
  const summaries = teamCycles ?? [];
  const visibleCycles = crossingCycles(summaries, range.from, range.to);
  const planQueries = useQueries({
    queries: visibleCycles.map((c) => ({ queryKey: ["team-cycles", c.id], queryFn: () => teamCyclesApi.getTeamCycle(c.id) })),
  });
  const details = planQueries.flatMap((q) => (q.data ? [q.data] : []));
  const planReady = teamCycles !== undefined && planQueries.every((q) => q.data !== undefined);
  const routinesQuery = useQuery({ queryKey: ["routines"], queryFn: routinesApi.listRoutines });

  const loading = sessionQueries.some((q) => q.isLoading) || calendarQuery.isLoading || !planReady;
  const failed = sessionQueries.some((q) => q.isError) || calendarQuery.isError || planQueries.some((q) => q.isError);
  const memberSessions: MemberSessions[] = members.map((a, i) => ({ athleteId: a.id, sessions: sessionQueries[i]?.data ?? [] }));
  const memberEvents: MemberEvents[] = members.map((a) => ({ athleteId: a.id, athleteName: a.name, events: (calendarQuery.data?.athleteEvents ?? []).filter((e) => e.athleteId === a.id) }));
  const teamEvents = calendarQuery.data?.teamEvents ?? [];
  // Los filtros solo existen en el mes.
  const showSessions = mode === "week" || typeFilter === "all" || typeFilter === "sessions";
  const showTeamEvents = typeFilter === "all" || typeFilter === "team";
  const showEvents = typeFilter === "all" || typeFilter === "events";
  // Hasta tener los planes no se muestran las sesiones de cada uno: las copias saldrían repetidas.
  const others = planReady
    ? ownSessions(memberSessions, new Set(details.flatMap((d) => d.sessions.map((s) => s.id))), new Set(summaries.map((c) => c.id)))
    : { own: [], otherTeam: [] };

  const block = planBlock({ mode, personId, typeFilter });
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
    const hovered = drag !== null && hover === iso;
    return [inTeamCycle(summaries, iso) && "tcx-in", hovered && (dropWhy(iso) ? "tcx-bad" : "tcx-ok")].filter(Boolean).join(" ");
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
              <span className="tms-card-name" title={session.name}>
                {session.name}
              </span>
              <span className={`tms-pill tms-pill-${badge.tone}`}>{badge.text}</span>
              {session.adjusted > 0 && <span className="tmc-tag tmc-tag-warn">{session.adjusted === 1 ? "1 ajustada" : `${session.adjusted} ajustadas`}</span>}
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

  const ownCard = (card: TeamSessionCard, iso: string, origin: string) => {
    const badge = sessionBadge(card, iso, todayIso);
    return (
      <Link key={`${origin}-${card.key}`} className="tms-card" to={`/sessions/${card.sessionIds[0]}`} title={`${card.name}: ${badge.text}`}>
        <span className="tms-card-name">{card.name}</span>
        <span className={`tms-pill tms-pill-${badge.tone}`}>{badge.text}</span>
        <span className="tcx-own">{origin}</span>
      </Link>
    );
  };

  const week = calendarWeek(anchor);
  const title = mode === "month" ? monthTitle(year, month) : `Semana del ${shortDate(week[0].iso)} al ${shortDate(week[6].iso)}`;
  const menu = pop?.kind === "menu" ? pop : null;
  const strips = visibleCycles.flatMap((c) => details.filter((d) => d.id === c.id));

  return (
    <>
      {mode === "month" && (
        <div className="tms-filters">
          <label className="sr-only" htmlFor="tms-type">
            Tipo
          </label>
          <select id="tms-type" className="tms-filter" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}>
            <option value="all">Todos los tipos</option>
            <option value="sessions">Sesiones</option>
            <option value="team">Eventos del equipo</option>
            <option value="events">Actividades de los atletas</option>
          </select>
          <label className="sr-only" htmlFor="tms-person">
            Persona
          </label>
          <select id="tms-person" className="tms-filter" value={personId} onChange={(e) => setPersonId(e.target.value)}>
            <option value="">Todas las personas</option>
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {failed && <div className="error-banner">Parte del calendario no se pudo cargar.</div>}

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
                  <SaveIndicator status={actions.status} />
                  <div className="tms-seg" role="group" aria-label="Vista">
                    <button type="button" aria-pressed={mode === "week"} onClick={() => setMode("week")}>
                      Semana
                    </button>
                    <button type="button" aria-pressed={mode === "month"} onClick={() => setMode("month")}>
                      Mes
                    </button>
                  </div>
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
              {strips.map((cycle) => {
                const start = cycle.startDate.slice(0, 10);
                const end = cycle.endDate.slice(0, 10);
                const reach = cycleReach(cycle, athletes);
                return (
                  <div key={cycle.id} className="tcx-cycle">
                    <b>{cycle.name}</b>
                    <span className="tmc-chip">
                      {shortDate(start)} – {shortDate(end)} {end.slice(0, 4)}
                    </span>
                    <span className="tmc-chip">
                      {reach.receiving} de {reach.of} atletas
                    </span>
                    <button type="button" className="tms-btn" aria-label={`Ver ciclo ${cycle.name}`} onClick={() => onViewCycle(cycle.id)}>
                      Ver ciclo
                    </button>
                  </div>
                );
              })}

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
                      <tr key={row[0].iso}>
                        {row.map((day: CalendarDay) => {
                          const isToday = day.iso === todayIso;
                          const inMonth = day.inMonth;
                          const showOwn = showSessions && inMonth;
                          const own = showTeamEvents && inMonth ? teamEvents.filter((e) => e.date === day.iso) : [];
                          const lines = showEvents && inMonth ? eventLines(memberEvents, day.iso) : [];
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
                              {showOwn && sessionCards(others.own, day.iso).map((card) => ownCard(card, day.iso, "Ciclo propio"))}
                              {showOwn && sessionCards(others.otherTeam, day.iso).map((card) => ownCard(card, day.iso, "De otro equipo"))}
                              {own.map((event) => (
                                <Link key={event.seriesId} className="tms-card" to={`/equipos/${teamId}/eventos?semana=${event.date}`} title={`${event.title}: ${hourLabel(event)}`}>
                                  <span className="tms-card-name">
                                    <i aria-hidden="true" style={{ background: TYPE_COLOR[event.type] }} />
                                    {event.title}
                                  </span>
                                  <span className="tms-pill tme-pill-team">Equipo</span>
                                </Link>
                              ))}
                              {lines.map((line) => (
                                <p key={line} className="tms-line">
                                  {line}
                                </p>
                              ))}
                              {inMonth && dropLabel(day.iso)}
                            </td>
                          );
                        })}
                      </tr>
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
                      {athletes.map((a) => {
                        const own = memberSessions.find((m) => m.athleteId === a.id)?.sessions ?? [];
                        return (
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
                                <Mark sessions={own.filter((s) => s.dayIso === d.iso)} isToday={d.iso === todayIso} />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
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
        <TeamSessionActions target={menu ? { cycle: menu.cycle, session: menu.session, anchor: menu.anchor } : null} today={todayIso} actions={actions} onClose={() => setPop(null)} />
        <UndoToast toast={actions.toast} onDismiss={() => announce(null)} />
      </div>
      {athletes.length === 0 && <p className="rm-note">Este equipo todavía no tiene atletas. Agrégalos desde el botón de atletas.</p>}
    </>
  );
}
