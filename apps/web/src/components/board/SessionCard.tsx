import { forwardRef } from "react";
import { Link } from "react-router-dom";
import type { TrainingSession } from "@cycles/shared";
import type { CycleProgress } from "../../services/trackingApi";
import { canMove } from "../../lib/board";
import { CheckBadge } from "../CheckBadge";
import { DotsIcon, LockIcon } from "./icons";

type ProgressSession = CycleProgress["sessions"][number];

interface SessionCardProps {
  session: TrainingSession;
  progress?: ProgressSession;
  dayLabel: string;
  tentative: boolean;
  saving: boolean;
  dragging: boolean;
  readOnly: boolean;
  menuOpen: boolean;
  onMenu: (button: HTMLButtonElement) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

// Tarjeta de una sesión en su día. Mismos estados que el calendario anterior:
// pendiente, hecha (verde, bloqueada), omitida (ámbar) y día tentativo.
export const SessionCard = forwardRef<HTMLButtonElement, SessionCardProps>(function SessionCard(
  { session, progress, dayLabel, tentative, saving, dragging, readOnly, menuOpen, onMenu, onDragStart, onDragEnd },
  menuRef,
) {
  const feedback = progress?.feedback;
  const done = session.status === "completed";
  const skipped = session.status === "skipped";
  const temp = session.id.startsWith("tmp-");
  const draggable = !readOnly && !temp && canMove(session);
  const stateLabel = done ? "hecha" : skipped ? "omitida" : "pendiente";
  const classes = [
    "bd-ses",
    done && "bd-ses-done",
    skipped && "bd-ses-skip",
    tentative && !done && !skipped && "bd-ses-tent",
    dragging && "bd-ses-lift",
    saving && "bd-ses-saving",
    draggable && "bd-ses-drag",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", session.name);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      aria-busy={saving || undefined}
    >
      <div className="bd-nr">
        {temp ? (
          <b>{session.name}</b>
        ) : (
          <Link
            to={`/sessions/${session.id}`}
            draggable={false}
            className="bd-ses-name"
            aria-label={`${session.name}, ${dayLabel}, ${stateLabel}${tentative && !done && !skipped ? ", día tentativo" : ""}`}
          >
            {session.name}
          </Link>
        )}
        {!done && !readOnly && !temp && (
          <button
            type="button"
            ref={menuRef}
            className="bd-mn"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            aria-label={`Acciones de ${session.name}, ${dayLabel}`}
            onClick={(e) => onMenu(e.currentTarget)}
          >
            <DotsIcon />
          </button>
        )}
      </div>
      <div className="bd-st">
        {done ? <CheckBadge /> : skipped ? <span className="pill pill-warn">Omitida</span> : <span className="bd-pend">Pendiente</span>}
        {feedback?.pain && <span className="pill pill-pain">Dolor</span>}
      </div>
      {tentative && !done && !skipped && <span className="bd-tentl">Día tentativo</span>}
      {done && feedback?.outcome === "completed" && feedback.srpe !== null && (
        <span className="bd-facts">
          <span>Esfuerzo {feedback.srpe}</span>
          {feedback.durationMinutes !== null && <span>{feedback.durationMinutes} min</span>}
        </span>
      )}
      {skipped && feedback?.outcome === "skipped" && feedback.notes && <span className="bd-facts">{feedback.notes}</span>}
      {done && (
        <span className="bd-lock" role="note">
          <LockIcon /> Ya se registró
        </span>
      )}
    </div>
  );
});
