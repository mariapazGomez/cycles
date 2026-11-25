import { useRef } from "react";
import { Link } from "react-router-dom";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import type { TeamDetail } from "../../services/teamsApi";
import { newCyclePath } from "../../lib/library";
import { initialsOf } from "../../lib/teams";

// «Agregar ciclo»: los ciclos son de cada atleta, así que se elige para quién y se abre su ficha
// con «Nuevo ciclo».
export function TeamCycleDialog({ team, onClose }: { team: TeamDetail; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, onClose);
  const available = team.athletes.filter((a) => a.status === "active");
  return (
    <div className="bd-modal-wrap">
      <div className="bd-modal-scrim" onClick={onClose} />
      <div ref={ref} className="bd-modal" role="dialog" aria-modal="true" aria-labelledby="tms-cycle-title">
        <header>
          <h2 id="tms-cycle-title">¿Para quién es el ciclo?</h2>
        </header>
        <div className="bd-modal-body">
          {available.length === 0 ? (
            <p className="rm-note">No hay atletas activos en este equipo.</p>
          ) : (
            <ul className="tm-list">
              {available.map((a) => (
                <li key={a.id} className="tm-row">
                  <Link className="tm-pick tms-pick-athlete" to={newCyclePath(a.id)}>
                    <span className="hm-avatar hm-avatar-sm" aria-hidden="true">
                      {initialsOf(a.name)}
                    </span>
                    <span>
                      {a.name}
                      <small>{a.currentCycle ? `Hoy: ${a.currentCycle.name}` : "Sin ciclo"}</small>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <footer>
            <button type="button" className="bd-btn" onClick={onClose}>
              Cancelar
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
