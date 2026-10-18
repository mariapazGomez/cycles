import { Link } from "react-router-dom";
import { AthleteRow, AthleteStatus } from "../lib/coachHome";

const STATUS_LABEL: Record<AthleteStatus, string> = {
  attention: "Con avisos",
  ok: "Al día",
  no_plan: "Sin ciclo",
  pending: "Invitación pendiente",
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export interface WeekProgress {
  done: number;
  of: number;
}

interface CoachAthletesPanelProps {
  rows: AthleteRow[];
  weekByAthlete: Record<string, WeekProgress | null>;
  isLoading: boolean;
}

// Todos los atletas en un solo lugar, con su semana como una fila de cuentas.
export function CoachAthletesPanel({ rows, weekByAthlete, isLoading }: CoachAthletesPanelProps) {
  return (
    <aside className="hm-card hm-side" aria-label="Tus atletas">
      <h2 className="section-title">Tus atletas</h2>
      {isLoading && <p className="hm-muted">Cargando…</p>}
      {!isLoading && rows.length === 0 && (
        <p className="hm-muted">Todavía no tienes atletas. Invita a uno para empezar.</p>
      )}
      <ul className="hm-ath-list">
        {rows.map((row) => {
          const week = weekByAthlete[row.id];
          const body = (
            <>
              <span className="hm-avatar hm-avatar-sm" aria-hidden="true">
                {initials(row.name)}
              </span>
              <span className="hm-ath-who">
                <b>{row.name}</b>
                <span className="hm-status">
                  <i className={`hm-dot hm-dot-${row.status}`} aria-hidden="true" />
                  {STATUS_LABEL[row.status]}
                </span>
              </span>
              {week && (
                <span className="hm-week" aria-label={`${week.done} de ${week.of} sesiones esta semana`}>
                  <span className="hm-beads" aria-hidden="true">
                    {Array.from({ length: week.of }, (_, i) => (
                      <i key={i} className={i < week.done ? "hm-bead hm-bead-done" : "hm-bead"} />
                    ))}
                  </span>
                  <span className="hm-week-text" aria-hidden="true">
                    {week.done} de {week.of}
                  </span>
                </span>
              )}
            </>
          );
          return (
            <li key={row.id}>
              {row.status === "pending" ? (
                <div className="hm-ath">{body}</div>
              ) : (
                <Link className="hm-ath" to={`/athletes/${row.id}`}>
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      {rows.length > 0 && (
        <Link className="button-ghost hm-all" to="/athletes">
          Ver todos →
        </Link>
      )}
    </aside>
  );
}
