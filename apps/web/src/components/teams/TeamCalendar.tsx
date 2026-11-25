import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import type { TeamAthlete } from "../../services/teamsApi";
import type { TrainingCycle } from "@cycles/shared";
import { loadAthleteSessions } from "../../services/boardApi";
import { getAthleteEvents } from "../../services/eventsApi";
import { calendarWeek, monthGrid, monthOf, monthRange, monthTitle, shiftMonth, startOfWeek, addDays, shortDate, WEEKDAY_SHORT, type CalendarDay } from "../../lib/eventCalendar";
import { eventLines, gmtLabel, sessionBadge, sessionCards, type MemberEvents, type MemberSessions } from "../../lib/teamCalendar";
import { initialsOf } from "../../lib/teams";
import type { BoardSession } from "../../lib/weekBoard";

type Mode = "week" | "month";
type TypeFilter = "all" | "sessions" | "events";

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

// Calendario del equipo: cuadrícula mensual (vista inicial) o semana por atleta. Las sesiones del
// equipo dicen cuántos atletas las hicieron; lo que agregaron los atletas va en una línea por tipo
// (sin sus notas, R7).
export function TeamCalendar({ athletes, cycles, todayIso }: { athletes: TeamAthlete[]; cycles: TrainingCycle[]; todayIso: string }) {
  // En pantalla angosta el calendario abre por semana (una fila por atleta), como en el diseño.
  const [mode, setMode] = useState<Mode>(() => (window.matchMedia("(max-width: 760px)").matches ? "week" : "month"));
  const [anchor, setAnchor] = useState(todayIso);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [personId, setPersonId] = useState("");

  const { year, month } = monthOf(anchor);
  const range = mode === "month" ? monthRange(year, month) : { from: startOfWeek(anchor), to: addDays(startOfWeek(anchor), 6) };
  // La invitación pendiente todavía no tiene ciclos ni actividades.
  const members = athletes.filter((a) => a.status === "active" && (personId === "" || a.id === personId));

  const sessionQueries = useQueries({
    queries: members.map((a) => ({
      queryKey: ["athletes", a.id, "sessions-range", range.from, range.to],
      queryFn: () => loadAthleteSessions(cycles.filter((c) => c.athleteId === a.id), range.from, range.to),
      staleTime: 60_000,
    })),
  });
  const eventQueries = useQueries({
    queries: members.map((a) => ({
      queryKey: ["athletes", a.id, "events", range.from, range.to],
      queryFn: () => getAthleteEvents(a.id, range.from, range.to),
      staleTime: 60_000,
    })),
  });

  const loading = sessionQueries.some((q) => q.isLoading) || eventQueries.some((q) => q.isLoading);
  const failed = sessionQueries.some((q) => q.isError) || eventQueries.some((q) => q.isError);
  const memberSessions: MemberSessions[] = members.map((a, i) => ({ athleteId: a.id, sessions: sessionQueries[i]?.data ?? [] }));
  const memberEvents: MemberEvents[] = members.map((a, i) => ({ athleteId: a.id, athleteName: a.name, events: eventQueries[i]?.data?.events ?? [] }));
  const showSessions = typeFilter !== "events";
  const showEvents = typeFilter !== "sessions";

  function move(delta: number) {
    if (mode === "week") return setAnchor(addDays(anchor, delta * 7));
    const next = shiftMonth(year, month, delta);
    setAnchor(`${next.year}-${String(next.month).padStart(2, "0")}-01`);
  }

  const week = calendarWeek(anchor);
  const title = mode === "month" ? monthTitle(year, month) : `Semana del ${shortDate(week[0].iso)} al ${shortDate(week[6].iso)}`;

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

      <section className="tms-cal" aria-label="Calendario del equipo" aria-busy={loading}>
        <div className="tms-cal-bar">
          <h2 className="tms-cal-title" aria-live="polite">
            {title.charAt(0).toUpperCase() + title.slice(1)}
            {mode === "month" && <small> ({gmtLabel(new Date().getTimezoneOffset())})</small>}
          </h2>
          <div className="tms-cal-tools">
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
            <button type="button" className="tms-btn" aria-label={mode === "month" ? "Mes anterior" : "Semana anterior"} onClick={() => move(-1)}>
              ‹
            </button>
            <button type="button" className="tms-btn" aria-label={mode === "month" ? "Mes siguiente" : "Semana siguiente"} onClick={() => move(1)}>
              ›
            </button>
          </div>
        </div>

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
                    const cards = showSessions && day.inMonth ? sessionCards(memberSessions, day.iso) : [];
                    const lines = showEvents && day.inMonth ? eventLines(memberEvents, day.iso) : [];
                    return (
                      <td key={day.iso} className={day.inMonth ? undefined : "tms-out"}>
                        <div className="tms-daynum">
                          {isToday ? (
                            <>
                              Hoy <b>{day.day}</b>
                            </>
                          ) : (
                            day.day
                          )}
                        </div>
                        {cards.map((card) => {
                          const badge = sessionBadge(card, day.iso, todayIso);
                          return (
                            <Link key={card.key} className="tms-card" to={`/sessions/${card.sessionIds[0]}`} title={`${card.name}: ${badge.text}`}>
                              <span className="tms-card-name">
                                <i aria-hidden="true" />
                                {card.name}
                              </span>
                              <span className={`tms-pill tms-pill-${badge.tone}`}>{badge.text}</span>
                            </Link>
                          );
                        })}
                        {lines.map((line) => (
                          <p key={line} className="tms-line">
                            {line}
                          </p>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="tms-week">
            <thead>
              <tr>
                <th scope="col">Atleta</th>
                {week.map((d, i) => (
                  <th key={d.iso} scope="col" title={`${WEEKDAY_SHORT[i]} ${d.day}`}>
                    {WEEK_LETTERS[i]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
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
        )}
      </section>
      {athletes.length === 0 && <p className="rm-note">Este equipo todavía no tiene atletas. Agrégalos desde el botón de atletas.</p>}
    </>
  );
}
