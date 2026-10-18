import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { TrainingCycle } from "@cycles/shared";
import { useAuth } from "../hooks/useAuth";
import { HERO_PATTERN } from "../assets/patterns";
import { LoadingScreen } from "../components/LoadingScreen";
import * as cyclesApi from "../services/cyclesApi";
import * as sessionsApi from "../services/sessionsApi";
import {
  bestStreak,
  calendarDay,
  dayLabel,
  longDay,
  monthGrid,
  monthKey,
  monthName,
  nextPending,
  toLocalDay,
  type CalendarSession,
} from "../lib/calendar";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

// Todos los planes del atleta (los que viven dentro de un macrociclo también) y
// sus sesiones, para dibujarlas en un solo calendario.
async function loadCalendar(): Promise<{ plans: TrainingCycle[]; sessions: CalendarSession[] }> {
  const top = await cyclesApi.listCycles();
  const nested = await Promise.all(
    top.filter((c) => c.cycleType === "macrocycle").map((c) => cyclesApi.getChildren(c.id)),
  );
  const plans = [...top.filter((c) => c.cycleType !== "macrocycle"), ...nested.flat()].filter(
    (c) => c.status !== "archived",
  );
  const lists = await Promise.all(plans.map((plan) => sessionsApi.listSessions(plan.id)));
  const sessions = plans.flatMap((plan, i) =>
    lists[i].map((s) => ({
      id: s.id,
      cycleId: plan.id,
      planName: plan.name,
      name: s.name,
      weekNumber: s.weekNumber,
      slotNumber: s.slotNumber,
      status: s.status,
      day: calendarDay(s),
    })),
  );
  return { plans, sessions };
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon({ flip }: { flip?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={flip ? { transform: "rotate(180deg)" } : undefined}>
      <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CalendarPage() {
  const { user } = useAuth();
  const isAthlete = user?.role === "athlete";
  const query = useQuery({ queryKey: ["athlete-calendar"], queryFn: loadCalendar, enabled: isAthlete });

  const todayIso = toLocalDay(new Date());
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selected, setSelected] = useState(todayIso);

  const plans = query.data?.plans ?? [];
  const sessions = query.data?.sessions ?? [];

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarSession[]>();
    for (const s of sessions) {
      if (!s.day) continue;
      map.set(s.day, [...(map.get(s.day) ?? []), s]);
    }
    return map;
  }, [sessions]);

  if (user && !isAthlete) return <Navigate to="/" replace />;
  if (query.isPending) return <LoadingScreen />;
  if (query.isError) {
    return (
      <div className="cal-page">
        <h1 className="cal-title">Calendario</h1>
        <div className="error-banner">No pudimos cargar tu calendario. Revisa tu conexión e inténtalo de nuevo.</div>
      </div>
    );
  }

  const grid = monthGrid(cursor.year, cursor.month);
  const thisMonth = monthKey(cursor.year, cursor.month);
  const doneInMonth = sessions.filter((s) => s.status === "completed" && s.day?.startsWith(thisMonth)).length;
  const everDone = sessions.some((s) => s.status === "completed");
  const streak = bestStreak(plans, sessions, new Date());
  // La racha es de hoy: solo se muestra en el mes en curso, no en los pasados.
  const isCurrentMonth = thisMonth === monthKey(new Date().getFullYear(), new Date().getMonth());
  const next = nextPending(sessions);

  // Meses navegables: del primer plan al último.
  const starts = plans.map((p) => p.startDate.slice(0, 7)).sort();
  const ends = plans.map((p) => p.endDate.slice(0, 7)).sort();
  const minMonth = starts[0] ?? thisMonth;
  const maxMonth = ends[ends.length - 1] ?? thisMonth;

  function shiftMonth(delta: number) {
    const date = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: date.getFullYear(), month: date.getMonth() });
  }

  const firstUpcoming = sessions
    .filter((s) => s.status === "pending" && s.day && s.day >= todayIso)
    .sort((a, b) => (a.day ?? "").localeCompare(b.day ?? ""))[0];

  let heroTitle: string;
  let heroLine: string;
  if (plans.length === 0) {
    heroTitle = "Todavía sin sesiones";
    heroLine = "Cuando tu coach te asigne un plan, lo verás aquí.";
  } else if (!everDone) {
    heroTitle = !firstUpcoming
      ? "Tu primera sesión te espera"
      : firstUpcoming.day === todayIso
        ? "Tu primera sesión es hoy"
        : `Tu primera sesión es el ${dayLabel(firstUpcoming.day ?? todayIso).toLowerCase()}`;
    heroLine = "Cada día que entrenes quedará marcado aquí.";
  } else {
    heroTitle = "";
    heroLine =
      isCurrentMonth && streak > 0
        ? `Llevas ${streak} ${streak === 1 ? "semana seguida" : "semanas seguidas"} entrenando.`
        : "Cada entrenamiento suma.";
  }

  const daySessions = byDay.get(selected) ?? [];
  const selectedTitle = selected === todayIso ? `Hoy, ${dayLabel(selected).toLowerCase()}` : dayLabel(selected);

  return (
    <div className="cal-page">
      <h1 className="cal-title">Calendario</h1>

      <section className="hm-hero" aria-label="Tu constancia">
        <div className="hm-hero-art" style={{ backgroundImage: `url(${HERO_PATTERN})` }} aria-hidden="true" />
        <div className="hm-hero-body">
          {heroTitle ? (
            <p className="hm-hero-big hm-hero-big-text">{heroTitle}</p>
          ) : (
            <p className="hm-hero-big">
              {doneInMonth}
              <small>
                {doneInMonth === 1 ? "entrenamiento" : "entrenamientos"} en {monthName(cursor.month)}
              </small>
            </p>
          )}
          {everDone && isCurrentMonth && (
            <div className="cal-weekdots" role="img" aria-label={`${streak} ${streak === 1 ? "semana seguida" : "semanas seguidas"}`}>
              {[0, 1, 2, 3].map((i) => (
                <i key={i} className={i < Math.min(streak, 4) ? "cal-dot-done" : undefined} />
              ))}
            </div>
          )}
          <p className="hm-hero-line">{heroLine}</p>
        </div>
      </section>

      {plans.length > 0 && (
        <>
          <div className="cal-mhead">
            <h2>
              {monthName(cursor.month)} {cursor.year}
            </h2>
            <div className="cal-mnav">
              <button type="button" aria-label="Mes anterior" onClick={() => shiftMonth(-1)} disabled={thisMonth <= minMonth}>
                <ChevronIcon flip />
              </button>
              <button type="button" aria-label="Mes siguiente" onClick={() => shiftMonth(1)} disabled={thisMonth >= maxMonth}>
                <ChevronIcon />
              </button>
            </div>
          </div>

          <div className="cal-card" role="grid" aria-label={`${monthName(cursor.month)} ${cursor.year}`}>
            <div className="cal-dow" role="row">
              {WEEKDAYS.map((d) => (
                <b key={d} role="columnheader">
                  {d}
                </b>
              ))}
            </div>
            {grid.map((week) => (
              <div className="cal-wk" role="row" key={week[0].iso}>
                {week.map((cell, i) => {
                  const list = cell.inMonth ? (byDay.get(cell.iso) ?? []) : [];
                  const done = list.some((s) => s.status === "completed");
                  const skipped = !done && list.some((s) => s.status === "skipped");
                  const planned = !done && !skipped && cell.iso >= todayIso && list.some((s) => s.status === "pending");
                  const isDone = (c: (typeof week)[number] | undefined) =>
                    !!c && c.inMonth && (byDay.get(c.iso) ?? []).some((s) => s.status === "completed");
                  const prev = done && isDone(week[i - 1]);
                  const nxt = done && isDone(week[i + 1]);
                  const cls = ["cal-cell"];
                  if (!cell.inMonth) cls.push("cal-out");
                  if (done) cls.push("cal-done");
                  if (done && (prev || nxt)) {
                    cls.push("cal-band");
                    if (!prev) cls.push("cal-first");
                    if (!nxt) cls.push("cal-last");
                  }
                  if (skipped) cls.push("cal-skip");
                  if (planned) cls.push("cal-plan");
                  if (cell.inMonth && cell.iso === todayIso) cls.push("cal-today");
                  if (cell.iso === selected) cls.push("cal-sel");
                  const status = done ? ", entrenaste" : skipped ? ", sesión omitida" : planned ? ", sesión programada" : "";
                  return (
                    <button
                      type="button"
                      key={cell.iso}
                      className={cls.join(" ")}
                      role="gridcell"
                      aria-label={`${longDay(cell.iso)}${status}`}
                      aria-pressed={cell.iso === selected}
                      onClick={() => {
                        setSelected(cell.iso);
                        if (!cell.inMonth) {
                          const date = new Date(`${cell.iso}T00:00:00`);
                          setCursor({ year: date.getFullYear(), month: date.getMonth() });
                        }
                      }}
                    >
                      <span className="cal-m">{done ? <CheckIcon /> : cell.day}</span>
                    </button>
                  );
                })}
              </div>
            ))}
            <div className="cal-legend">
              <span>
                <i className="cal-lg-done" />
                Entrenaste
              </span>
              <span>
                <i className="cal-lg-plan" />
                Programada
              </span>
              <span>
                <i className="cal-lg-skip" />
                Omitida
              </span>
            </div>
          </div>

          <h2 className="cal-dayhead">{selectedTitle}</h2>
          {daySessions.length === 0 ? (
            <div className="cal-empty">No hay sesiones este día.</div>
          ) : (
            <div className="cal-rows">
              {daySessions.map((s) => {
                const isNext = next?.id === s.id;
                const stateClass = s.status === "completed" ? "cal-node-done" : s.status === "skipped" ? "cal-node-warn" : "";
                return (
                  <Link
                    key={s.id}
                    to={`/sessions/${s.id}`}
                    className={isNext ? "cal-row cal-row-next" : "cal-row"}
                    aria-label={isNext ? `Siguiente: ${s.name}` : undefined}
                  >
                    <span className={`cal-node ${stateClass}`}>{s.status === "completed" ? <CheckIcon /> : s.slotNumber}</span>
                    <span className="cal-info">
                      <b>{s.name}</b>
                      <span>{s.planName}</span>
                    </span>
                    {s.status === "completed" && <span className="pill pill-ok">Completada</span>}
                    {s.status === "skipped" && <span className="pill pill-warn">Omitida</span>}
                    {s.status === "pending" && (isNext ? <span className="pill pill-blue">Siguiente</span> : <span className="pill">Pendiente</span>)}
                    <ChevronIcon />
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
