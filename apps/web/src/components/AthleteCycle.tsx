import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TrainingCycle, TrainingSession } from "@cycles/shared";
import { HERO_PATTERN } from "../assets/patterns";
import { LoadingScreen } from "./LoadingScreen";
import { WeekChain } from "./PlanHero";
import { ApiError } from "../services/httpClient";
import * as sessionsApi from "../services/sessionsApi";
import * as executionApi from "../services/executionApi";
import { dayLabel, toLocalDay } from "../lib/calendar";
import { dueNow, firstPending, weekDays, weekIsComplete, weekRangeLabel } from "../lib/athleteCycle";
import { formatShortDate, planWeekOf } from "../lib/format";
import { heroKind, planStats, totalWeeks } from "../lib/planGrid";

// Vista del ciclo para el atleta: no arma nada, lo recorre. Una tarjeta oscura
// con dónde va y la sesión que le toca, y debajo solo la semana que elige.
// Diseño: docs/diseno/plan-del-atleta.

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AthleteCycle({ cycle }: { cycle: TrainingCycle }) {
  const queryClient = useQueryClient();
  const sessionsQuery = useQuery({
    queryKey: ["cycles", cycle.id, "sessions"],
    queryFn: () => sessionsApi.listSessions(cycle.id),
  });
  const [picked, setPicked] = useState<number | null>(null);
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const sessions = sessionsQuery.data ?? [];
  const weeks = totalWeeks(cycle.startDate, cycle.endDate);
  const currentWeek = planWeekOf(cycle.startDate);
  const stats = planStats(sessions, currentWeek);
  const kind = heroKind(stats, currentWeek, weeks);
  const week = picked ?? Math.min(Math.max(currentWeek, 1), weeks);
  const todayIso = toLocalDay(new Date());
  const due = dueNow(sessions, currentWeek);
  const next = firstPending(sessions);

  const scheduleMutation = useMutation({
    mutationFn: ({ id, date }: { id: string; date: string | null }) => executionApi.scheduleSession(id, date),
    onSuccess: () => {
      setPickingId(null);
      setPickError(null);
      queryClient.invalidateQueries({ queryKey: ["cycles", cycle.id, "sessions"] });
      queryClient.invalidateQueries({ queryKey: ["athlete-calendar"] });
      openerRef.current?.focus();
    },
    onError: (error: unknown) => {
      setPickError(error instanceof ApiError ? error.message : "No se pudo guardar el día. Intenta de nuevo.");
    },
  });

  // La hoja se cierra con Escape.
  useEffect(() => {
    if (!pickingId) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPickingId(null);
        setPickError(null);
        openerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pickingId]);

  if (sessionsQuery.isLoading) return <LoadingScreen />;

  const inWeek = sessions.filter((s) => s.weekNumber === week).sort((a, b) => a.slotNumber - b.slotNumber);
  const days = weekDays(cycle.startDate, week);
  const dayStatus = new Map<string, "has" | "ok">();
  for (const s of inWeek) {
    const iso = s.scheduledDate?.slice(0, 10);
    if (!iso) continue;
    dayStatus.set(iso, s.status === "completed" || dayStatus.get(iso) === "ok" ? "ok" : "has");
  }
  const picking = sessions.find((s) => s.id === pickingId) ?? null;

  // Días de la hoja: los pasados y los que quedan fuera del ciclo no se pueden elegir.
  const pickDays = picking
    ? weekDays(cycle.startDate, picking.weekNumber).map((d) => ({
        d,
        disabled:
          d.iso < todayIso ||
          d.iso < cycle.startDate.slice(0, 10) ||
          d.iso > cycle.endDate.slice(0, 10) ||
          scheduleMutation.isPending,
        chosen: picking.scheduledDate?.slice(0, 10) === d.iso,
      }))
    : [];
  const focusIso = (pickDays.find((p) => p.chosen) ?? pickDays.find((p) => !p.disabled))?.d.iso;

  function openPicker(session: TrainingSession, element: HTMLElement) {
    openerRef.current = element;
    setPickError(null);
    setPickingId(session.id);
  }

  function rowDay(session: TrainingSession): string | null {
    const iso = session.scheduledDate?.slice(0, 10);
    if (!iso) return null;
    return iso === todayIso ? `Hoy, ${dayLabel(iso).toLowerCase()}` : dayLabel(iso);
  }

  return (
    <div className="al-page">
      <Link className="rt-back" to="/cycles">
        ← Mis ciclos
      </Link>
      <h1 className="al-title">{cycle.name}</h1>
      {cycle.objective && <p className="al-objective">{cycle.objective}</p>}

      <section className="hm-hero" aria-label="Avance del ciclo">
        <div className="hm-hero-art" style={{ backgroundImage: `url(${HERO_PATTERN})` }} aria-hidden="true" />
        <div className="hm-hero-body">
          {kind === "empty" && (
            <>
              <p className="hm-hero-big hm-hero-big-text">Todavía sin sesiones</p>
              <p className="hm-hero-line">Tu coach aún no asigna rutinas a este ciclo.</p>
            </>
          )}
          {kind === "upcoming" && (
            <>
              <p className="hm-hero-big hm-hero-big-text">Empieza el {formatShortDate(cycle.startDate)}</p>
              <p className="hm-hero-line">
                Tu coach asignó {stats.assigned} {stats.assigned === 1 ? "sesión" : "sesiones"}.
              </p>
            </>
          )}
          {kind === "running" && (
            <>
              <p className="hm-hero-big">
                {currentWeek}
                <small>de {weeks} semanas</small>
              </p>
              <WeekChain weeks={weeks} currentWeek={currentWeek} />
              <p className="hm-hero-line">
                {stats.weekAssigned > 0
                  ? due || stats.weekCompleted < stats.weekAssigned
                    ? `Esta semana llevas ${stats.weekCompleted} de ${stats.weekAssigned} sesiones. `
                    : "Terminaste las sesiones de esta semana. "
                  : "Esta semana no tiene sesiones asignadas. "}
                En total, {stats.completed} de {stats.assigned}.
              </p>
              {due && (
                <Link className="al-cta" to={`/sessions/${due.id}/registro`}>
                  Te toca {due.name}
                  <ChevronIcon />
                </Link>
              )}
            </>
          )}
          {kind === "ended" && (
            <>
              <p className="hm-hero-big hm-hero-big-text">El ciclo terminó</p>
              <WeekChain weeks={weeks} currentWeek={weeks + 1} />
              <p className="hm-hero-line">
                Completaste {stats.completed} de {stats.assigned} sesiones.
              </p>
            </>
          )}
        </div>
      </section>

      {kind !== "empty" && (
        <>
          <div className="al-weeks" role="group" aria-label="Semanas">
            {Array.from({ length: weeks }, (_, i) => i + 1).map((n) => {
              const cls = ["al-chip"];
              if (n === week) cls.push("al-chip-on");
              if (n === currentWeek && n !== week) cls.push("al-chip-cur");
              if (weekIsComplete(sessions, n)) cls.push("al-chip-done");
              return (
                <button
                  key={n}
                  type="button"
                  className={cls.join(" ")}
                  aria-pressed={n === week}
                  aria-label={`Semana ${n}${weekIsComplete(sessions, n) ? ", completa" : ""}`}
                  onClick={() => setPicked(n)}
                >
                  S{n}
                </button>
              );
            })}
          </div>

          <div className="al-week-head">
            <h2>Semana {week}</h2>
            <span>{weekRangeLabel(cycle.startDate, week)}</span>
          </div>

          <div className="al-strip" role="group" aria-label="Días de la semana">
            {days.map((d) => (
              <div key={d.iso} className={d.iso === todayIso ? "al-day-col al-today" : "al-day-col"}>
                <b>{d.letter}</b>
                <span>{d.day}</span>
                <i className={dayStatus.get(d.iso) ?? undefined} />
              </div>
            ))}
          </div>

          {inWeek.length === 0 ? (
            <div className="al-empty">No hay sesiones en esta semana.</div>
          ) : (
            <div className="al-rows">
              {inWeek.map((s) => {
                const isNext = next?.id === s.id;
                const day = rowDay(s);
                const nodeCls = s.status === "completed" ? "al-node al-node-done" : s.status === "skipped" ? "al-node al-node-warn" : "al-node";
                return (
                  <div key={s.id} className={isNext ? "al-row al-row-next" : "al-row"}>
                    <span className={nodeCls}>{s.status === "completed" ? <CheckIcon /> : s.slotNumber}</span>
                    <div className="al-info">
                      <Link className="al-name" to={`/sessions/${s.id}`} aria-label={isNext ? `Siguiente: ${s.name}` : s.name}>
                        {s.name}
                      </Link>
                      {s.status === "pending" ? (
                        <button
                          type="button"
                          className={day ? "al-daybtn" : "al-daybtn al-daybtn-none"}
                          aria-label={day ? `Cambiar el día de ${s.name}` : `Elegir día para ${s.name}`}
                          onClick={(e) => openPicker(s, e.currentTarget)}
                        >
                          {day ?? "Elegir día"}
                        </button>
                      ) : (
                        day && <span className="al-daytext">{day}</span>
                      )}
                    </div>
                    {s.status === "completed" && <span className="pill pill-ok">Completada</span>}
                    {s.status === "skipped" && <span className="pill pill-warn">Omitida</span>}
                    {s.status === "pending" && (isNext ? <span className="pill pill-blue">Siguiente</span> : <span className="pill">Pendiente</span>)}
                    <span className="al-chev">
                      <ChevronIcon />
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {picking && (
        <>
          <div
            className="al-scrim"
            onClick={() => {
              setPickingId(null);
              openerRef.current?.focus();
            }}
          />
          <div className="al-sheet" role="dialog" aria-modal="true" aria-label="Elegir día">
            <h3>¿Qué día harás esta sesión?</h3>
            <p className="al-sheet-name">{picking.name}</p>
            <div className="al-sheet-week">
              <b>Semana {picking.weekNumber}</b>
              <span>{weekRangeLabel(cycle.startDate, picking.weekNumber)}</span>
            </div>
            {pickError && (
              <div className="error-banner" role="alert">
                {pickError}
              </div>
            )}
            <div className="al-sheet-days">
              {pickDays.map(({ d, disabled, chosen }) => {
                return (
                  <button
                    key={d.iso}
                    type="button"
                    className={chosen ? "al-dayb al-dayb-on" : "al-dayb"}
                    disabled={disabled}
                    autoFocus={d.iso === focusIso}
                    aria-pressed={chosen}
                    aria-label={dayLabel(d.iso)}
                    onClick={() => scheduleMutation.mutate({ id: picking.id, date: d.iso })}
                  >
                    <small>{d.letter}</small>
                    {d.day}
                  </button>
                );
              })}
            </div>
            {picking.scheduledDate && (
              <button
                type="button"
                className="al-clear"
                disabled={scheduleMutation.isPending}
                onClick={() => scheduleMutation.mutate({ id: picking.id, date: null })}
              >
                Quitar el día asignado
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
