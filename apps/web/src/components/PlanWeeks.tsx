import { Link } from "react-router-dom";
import type { TrainingSession } from "@cycles/shared";
import type { CycleProgress } from "../services/trackingApi";
import { cellKey, weekState } from "../lib/planGrid";

type ProgressSession = CycleProgress["sessions"][number];

interface PlanWeeksProps {
  weeks: number;
  slots: number;
  currentWeek: number;
  sessionByCell: Map<string, TrainingSession>;
  progressById: Map<string, ProgressSession>;
  isCoach: boolean;
  onAssign: (week: number, slot: number) => void;
}

const STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "pill" },
  completed: { label: "Completada", className: "pill pill-ok" },
  skipped: { label: "Omitida", className: "pill pill-warn" },
};

function PlanCell({ session, progress }: { session: TrainingSession; progress?: ProgressSession }) {
  const feedback = progress?.feedback;
  const status = STATUS[session.status] ?? STATUS.pending;
  const done = session.status === "completed";
  const skipped = session.status === "skipped";
  return (
    <Link to={`/sessions/${session.id}`} className={`pl-cell${done ? " pl-cell-done" : ""}${skipped ? " pl-cell-skip" : ""}`}>
      <b>{session.name}</b>
      <span className="pl-cell-state">
        <span className={status.className}>{status.label}</span>
        {feedback?.pain && <span className="pill pill-pain">Dolor</span>}
      </span>
      {feedback?.outcome === "completed" && feedback.srpe !== null && (
        <span className="pl-facts">
          <span>Esfuerzo {feedback.srpe}</span>
          {feedback.durationMinutes !== null && <span>{feedback.durationMinutes} min</span>}
        </span>
      )}
      {feedback?.outcome === "skipped" && feedback.notes && <span className="pl-note">{feedback.notes}</span>}
    </Link>
  );
}

// Cadena vertical de semanas: cada semana es una tarjeta con sus sesiones,
// unidas por una línea como las cuentas de una cadena.
export function PlanWeeks({ weeks, slots, currentWeek, sessionByCell, progressById, isCoach, onAssign }: PlanWeeksProps) {
  return (
    <ol className="pl-weeks">
      {Array.from({ length: weeks }, (_, i) => i + 1).map((week) => {
        const state = weekState(week, currentWeek);
        let assigned = 0;
        let completed = 0;
        for (let slot = 1; slot <= slots; slot++) {
          const session = sessionByCell.get(cellKey(week, slot));
          if (session) {
            assigned += 1;
            if (session.status === "completed") completed += 1;
          }
        }
        return (
          <li key={week} className={`pl-week pl-week-${state}`} aria-current={state === "current" ? "step" : undefined}>
            <span className="pl-bead" aria-hidden="true">
              {week}
            </span>
            <div className="hm-card pl-week-card">
              <div className="pl-week-head">
                <h3>Semana {week}</h3>
                {state === "current" && <span className="pill pill-blue">Esta semana</span>}
                <span className="pl-spacer" />
                {assigned > 0 ? (
                  <>
                    <span className="pl-beads" aria-hidden="true">
                      {Array.from({ length: slots }, (_, k) => (
                        <i key={k} className={k < completed ? "pl-mini pl-mini-done" : "pl-mini"} />
                      ))}
                    </span>
                    <span className="pl-hint">
                      {completed} de {slots}
                    </span>
                  </>
                ) : (
                  <span className="pl-hint">Sin rutinas</span>
                )}
              </div>
              <div className="pl-slots" style={{ ["--slots" as string]: slots }}>
                {Array.from({ length: slots }, (_, i) => i + 1).map((slot) => {
                  const session = sessionByCell.get(cellKey(week, slot));
                  if (session) {
                    return <PlanCell key={slot} session={session} progress={progressById.get(session.id)} />;
                  }
                  return isCoach ? (
                    <button
                      key={slot}
                      type="button"
                      className="pl-add"
                      aria-label={`Asignar rutina a la semana ${week}, sesión ${slot}`}
                      onClick={() => onAssign(week, slot)}
                    >
                      + Asignar
                    </button>
                  ) : (
                    <span key={slot} className="pl-none" aria-label="Sin sesión asignada">
                      —
                    </span>
                  );
                })}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
