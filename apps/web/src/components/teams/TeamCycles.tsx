import { Link, useNavigate } from "react-router-dom";
import type { TeamAthlete } from "../../services/teamsApi";
import { cycleProgress } from "../../lib/teamCalendar";
import { initialsOf } from "../../lib/teams";

// El ciclo vigente de cada atleta del equipo, la semana en que va y su avance. Al tocar una fila
// se abre el ciclo en la pizarra del atleta.
export function TeamCycles({ athletes, todayIso }: { athletes: TeamAthlete[]; todayIso: string }) {
  const navigate = useNavigate();
  if (athletes.length === 0) return <p className="rm-note">Este equipo todavía no tiene atletas. Agrégalos desde el botón de atletas.</p>;
  return (
    <table className="rm-table tms-cycles">
      <thead>
        <tr>
          <th scope="col">Atleta</th>
          <th scope="col">Ciclo</th>
          <th scope="col">Semana</th>
          <th scope="col">Avance</th>
        </tr>
      </thead>
      <tbody>
        {athletes.map((a) => {
          const cycle = a.status === "pending" ? null : a.currentCycle;
          const progress = cycle ? cycleProgress(cycle, todayIso) : null;
          const to = cycle ? `/athletes/${a.id}?ciclo=${cycle.id}` : null;
          return (
            <tr key={a.id} className={to ? "tms-rowlink" : undefined} onClick={to ? () => navigate(to) : undefined}>
              <td>
                <Link className="tm-athlete" to={to ?? `/athletes/${a.id}`} onClick={(e) => e.stopPropagation()}>
                  <span className="hm-avatar hm-avatar-sm" aria-hidden="true">
                    {initialsOf(a.name)}
                  </span>
                  <span>{a.name}</span>
                </Link>
              </td>
              <td>{a.status === "pending" ? "Invitación pendiente" : cycle ? cycle.name : "Sin ciclo"}</td>
              <td>{progress ? `${progress.week} de ${progress.total}` : "—"}</td>
              <td>
                {progress ? (
                  <div className="tms-bar" role="img" aria-label={`Semana ${progress.week} de ${progress.total}`}>
                    <i style={{ width: `${progress.percent}%` }} />
                  </div>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
