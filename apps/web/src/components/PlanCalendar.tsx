import { useState } from "react";
import { Link } from "react-router-dom";
import type { TrainingSession } from "@cycles/shared";
import type { CycleProgress } from "../services/trackingApi";
import { cellKey, weekState } from "../lib/planGrid";
import {
  addDays,
  columnLabels,
  dayOfMonth,
  sessionOffset,
  utcDay,
  weekRangeLabel,
  weekStartIso,
  weekdayShort,
} from "../lib/weekCalendar";
import { CheckBadge } from "./CheckBadge";

type ProgressSession = CycleProgress["sessions"][number];

interface PlanCalendarProps {
  startDate: string;
  weeks: number;
  slots: number;
  currentWeek: number;
  // Día de hoy ("AAAA-MM-DD") para marcarlo en la grilla.
  todayIso: string;
  sessionByCell: Map<string, TrainingSession>;
  progressById: Map<string, ProgressSession>;
  isCoach: boolean;
  onAssign: (week: number, slot: number) => void;
}

interface DayEntry {
  slot: number;
  session?: TrainingSession;
}

function formatEffort(value: number): string {
  return String(Math.round(value * 10) / 10).replace(".", ",");
}

function SessionCell({
  session,
  progress,
  dayNumber,
  dayName,
  tentative,
}: {
  session: TrainingSession;
  progress?: ProgressSession;
  dayNumber: number;
  dayName: string;
  tentative: boolean;
}) {
  const feedback = progress?.feedback;
  const done = session.status === "completed";
  const skipped = session.status === "skipped";
  const stateLabel = done ? "completada" : skipped ? "omitida" : "pendiente";
  return (
    <Link
      to={`/sessions/${session.id}`}
      className={`pc-cell${done ? " pc-cell-done" : ""}${skipped ? " pc-cell-skip" : ""}${tentative ? " pc-cell-tent" : ""}`}
      aria-label={`${session.name}, ${dayName} ${dayNumber}, ${stateLabel}${tentative ? ", día tentativo" : ""}`}
      title={session.name}
    >
      <span className="pc-cell-day" aria-hidden="true">
        {dayNumber}
      </span>
      <b>{session.name}</b>
      <span className="pc-cell-state">
        {done ? <CheckBadge /> : skipped ? <span className="pill pill-warn">Omitida</span> : <span className="pc-pending">Pendiente</span>}
        {feedback?.pain && <span className="pill pill-pain">Dolor</span>}
      </span>
      {tentative && <span className="pc-tent">Día tentativo</span>}
      {feedback?.outcome === "completed" && feedback.srpe !== null && (
        <span className="pc-facts">
          <span>Esfuerzo {feedback.srpe}</span>
          {feedback.durationMinutes !== null && <span>{feedback.durationMinutes} min</span>}
        </span>
      )}
      {feedback?.outcome === "skipped" && feedback.notes && <span className="pc-note">{feedback.notes}</span>}
    </Link>
  );
}

// Calendario del ciclo (docs/diseno/ciclo-en-calendario): una tarjeta por semana
// con sus siete días, la sesión puesta en su día y un resumen al final. Las
// semanas pasadas se pliegan a una línea.
export function PlanCalendar({
  startDate,
  weeks,
  slots,
  currentWeek,
  todayIso,
  sessionByCell,
  progressById,
  isCoach,
  onAssign,
}: PlanCalendarProps) {
  const [toggled, setToggled] = useState<Record<number, boolean>>({});
  const labels = columnLabels(startDate);
  // Un ciclo que ya terminó se abre completo: plegar todas sus semanas dejaría
  // el calendario sin días a la vista.
  const ended = currentWeek > weeks;
  // Una sesión sin fecha propia (o con una fuera de su semana) cae en el día que
  // sugiere su lugar: se marca como tentativa hasta que tenga fecha.
  const isTentative = (session: TrainingSession, week: number) => {
    if (!session.scheduledDate) return true;
    const diff = Math.round(
      (utcDay(session.scheduledDate) - utcDay(weekStartIso(startDate, week))) / 86_400_000,
    );
    return diff < 0 || diff > 6;
  };
  const hasTentative = [...sessionByCell.values()].some((s) => isTentative(s, s.weekNumber));

  return (
    <div className="pc">
      {hasTentative && (
        <p className="pc-tent-note">
          Las sesiones sin fecha aparecen en los días que sugiere el ciclo, marcadas como tentativas.
        </p>
      )}
      <div className="pc-head" aria-hidden="true">
        <span />
        {labels.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
        <span>Semana</span>
      </div>

      <ol className="pc-weeks">
        {Array.from({ length: weeks }, (_, i) => i + 1).map((week) => {
          const state = weekState(week, currentWeek);
          const first = weekStartIso(startDate, week);
          const open = toggled[week] ?? (ended || state !== "past");

          const days: DayEntry[][] = Array.from({ length: 7 }, () => []);
          let assigned = 0;
          let completed = 0;
          let series = 0;
          const efforts: number[] = [];
          for (let slot = 1; slot <= slots; slot++) {
            const session = sessionByCell.get(cellKey(week, slot));
            const offset = sessionOffset(startDate, week, slot, slots, session?.scheduledDate);
            days[offset].push({ slot, session });
            if (session) {
              assigned += 1;
              if (session.status === "completed") {
                completed += 1;
                const progress = progressById.get(session.id);
                series += progress?.exercises.reduce((sum, e) => sum + e.actual.sets.length, 0) ?? 0;
                const srpe = progress?.feedback?.srpe;
                if (typeof srpe === "number") efforts.push(srpe);
              }
            }
          }
          const effort = efforts.length ? efforts.reduce((a, b) => a + b, 0) / efforts.length : null;

          return (
            <li
              key={week}
              className={`pc-week pc-week-${state}`}
              aria-label={`Semana ${week}`}
              aria-current={state === "current" ? "step" : undefined}
            >
              <button
                type="button"
                className="pc-weeklabel"
                aria-expanded={open}
                aria-label={`Semana ${week}, ${open ? "plegar" : "desplegar"}`}
                onClick={() => setToggled((prev) => ({ ...prev, [week]: !open }))}
              >
                <b>Semana {week}</b>
                <small>{weekRangeLabel(first)}</small>
                {state === "current" && <span className="pc-now">Esta semana</span>}
              </button>

              {open ? (
                days.map((entries, offset) => {
                  const iso = addDays(first, offset);
                  const isToday = iso === todayIso;
                  return (
                    <div key={offset} className={`pc-day${isToday ? " pc-day-today" : ""}${entries.length === 0 ? " pc-day-rest" : ""}`}>
                      <span className="pc-day-name" aria-hidden="true">
                        {labels[offset]} {dayOfMonth(iso)}
                      </span>
                      {entries.map(({ slot, session }) =>
                        session ? (
                          <SessionCell
                            key={slot}
                            session={session}
                            progress={progressById.get(session.id)}
                            dayNumber={dayOfMonth(iso)}
                            dayName={weekdayShort(iso)}
                            tentative={session.status === "pending" && isTentative(session, week)}
                          />
                        ) : isCoach ? (
                          <button
                            key={slot}
                            type="button"
                            className="pc-add"
                            aria-label={`Asignar rutina el ${weekdayShort(iso)} ${dayOfMonth(iso)}`}
                            onClick={() => onAssign(week, slot)}
                          >
                            <span className="pc-cell-day" aria-hidden="true">
                              {dayOfMonth(iso)}
                            </span>
                            + Asignar
                          </button>
                        ) : (
                          <span key={slot} className="pc-none" aria-label="Sin sesión asignada" />
                        ),
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="pc-mini">
                  {days.some((entries) => entries.some((e) => e.session)) ? (
                    days.map((entries, offset) =>
                      entries.map(({ slot, session }) => {
                        if (!session) return null;
                        const progress = progressById.get(session.id);
                        const done = session.status === "completed";
                        const skipped = session.status === "skipped";
                        return (
                          <Link
                            key={`${offset}-${slot}`}
                            to={`/sessions/${session.id}`}
                            className={`pc-chip${done ? " pc-chip-done" : skipped ? " pc-chip-skip" : ""}`}
                            aria-label={`${session.name}, ${weekdayShort(addDays(first, offset))} ${dayOfMonth(addDays(first, offset))}, ${done ? "completada" : skipped ? "omitida" : "pendiente"}`}
                          >
                            {labels[offset]}
                            {done && <CheckBadge small />}
                            {skipped && " omitida"}
                            {!done && !skipped && " pendiente"}
                            {progress?.feedback?.pain && ", dolor"}
                          </Link>
                        );
                      }),
                    )
                  ) : (
                    <span className="pc-mini-empty">Sin sesiones</span>
                  )}
                </div>
              )}

              <div className="pc-summary">
                {assigned > 0 ? (
                  <>
                    <b>
                      {completed} de {assigned}
                    </b>
                    {series > 0 && <span>{series} series</span>}
                    {effort !== null && <span>Esfuerzo {formatEffort(effort)}</span>}
                  </>
                ) : (
                  <span>Sin sesiones</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
