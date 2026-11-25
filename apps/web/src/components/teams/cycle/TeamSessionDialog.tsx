import { useRef, useState, type FormEvent } from "react";
import type { SessionStructureInput } from "@cycles/shared";
import { useDialogFocus } from "../../../hooks/useDialogFocus";
import type { TeamSession } from "../../../services/teamCyclesApi";
import { editReach, structureOf } from "../../../lib/teamCycle";
import { fromRows, rowsOf, type EditRow } from "../../../lib/teamSessionRows";
import { athletesCount } from "../../../lib/teams";
import { dayName } from "../../../lib/cycleRange";
import { LoadCell } from "../../builder/LoadCell";

// «Editar ejercicios» de una sesión del equipo: series, repeticiones y carga. El plan no tiene
// atleta, así que el % del RM está siempre disponible y no se muestran pesos por persona.
export function TeamSessionDialog({
  session,
  today,
  nameOf,
  onSave,
  onClose,
}: {
  session: TeamSession;
  today: string;
  nameOf: (athleteId: string) => string;
  onSave: (next: SessionStructureInput, previous: SessionStructureInput) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, onClose);
  const [rows, setRows] = useState<EditRow[]>(() => rowsOf(session));
  const [attempted, setAttempted] = useState(false);
  const { reach, kept } = editReach(session, today, nameOf);
  const result = fromRows(structureOf(session), rows);

  function submit(e: FormEvent) {
    e.preventDefault();
    setAttempted(true);
    if (result.input) onSave(result.input, structureOf(session));
  }

  const patch = (id: string, change: Partial<EditRow>) => setRows((list) => list.map((r) => (r.key === id ? { ...r, ...change } : r)));

  return (
    <div className="bd-modal-wrap">
      <div className="bd-modal-scrim" onClick={onClose} />
      <div ref={ref} className="bd-modal tmc-modal tmc-edit" role="dialog" aria-modal="true" aria-labelledby="tmc-edit-title">
        <header>
          <h2 id="tmc-edit-title">
            {session.name}, {dayName(session.scheduledDate.slice(0, 10), today)}
          </h2>
        </header>
        <form className="bd-modal-body" noValidate onSubmit={submit}>
          <p className="tmc-info">
            Estás editando la sesión del equipo. El cambio llega a <b>{athletesCount(reach)}</b>.{kept ? ` ${kept}` : ""}
          </p>
          {rows.length === 0 ? (
            <p className="rm-note">Esta sesión no tiene ejercicios.</p>
          ) : (
            <table className="tmc-ex">
              <thead>
                <tr>
                  <th scope="col">Ejercicio</th>
                  <th scope="col">Series</th>
                  <th scope="col">Reps</th>
                  <th scope="col">Carga</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <th scope="row">{row.name}</th>
                    <td>
                      <input className={`bd-inp${attempted && result.badSets.has(row.key) ? " bd-inp-bad" : ""}`} inputMode="numeric" aria-label={`Series de ${row.name}`} value={row.sets} onChange={(e) => patch(row.key, { sets: e.target.value })} />
                    </td>
                    <td>
                      <input className={`bd-inp${attempted && result.badReps.has(row.key) ? " bd-inp-bad" : ""}`} inputMode="numeric" aria-label={`Repeticiones de ${row.name}`} value={row.reps} onChange={(e) => patch(row.key, { reps: e.target.value })} />
                    </td>
                    <td>
                      <LoadCell row={row} bad={attempted && result.badLoad.has(row.key)} onChange={(change) => patch(row.key, change)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {attempted && !result.input && (
            <p className="bd-hint bd-hint-bad" role="alert">
              Revisa los campos marcados: series y repeticiones son números enteros, y el % del RM va de 1 a 100.
            </p>
          )}
          <footer>
            <button type="button" className="bd-btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="bd-btn bd-btn-p" disabled={rows.length === 0}>
              Guardar para {athletesCount(reach)}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
