import { useRef, useState } from "react";
import { muscleGroupLabel } from "../../lib/muscleGroups";
import { isRowComplete, parseNumber } from "../../lib/routineStats";
import type { Row } from "../../lib/routineRows";
import { useDialogFocus } from "../../hooks/useDialogFocus";

type Draft = Pick<Row, "sets" | "reps" | "weight" | "restSeconds" | "rir">;

// Ventana «Detalles del ejercicio»: los mismos campos y textos del editor de
// rutinas (series, reps, carga, descanso y reps en reserva objetivo).
export function ExerciseDetailsDialog({
  row,
  onSave,
  onClose,
}: {
  row: Row;
  onSave: (patch: Draft) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, onClose);
  const [draft, setDraft] = useState<Draft>({
    sets: row.sets,
    reps: row.reps,
    weight: row.weight,
    restSeconds: row.restSeconds,
    rir: row.rir,
  });
  const [attempted, setAttempted] = useState(false);
  const repsMissing = attempted && !isRowComplete({ sets: draft.sets, reps: draft.reps });
  const patch = (next: Partial<Draft>) => setDraft((d) => ({ ...d, ...next }));

  return (
    <div className="bd-modal-wrap">
      <div className="bd-modal-scrim" onClick={onClose} />
      <div ref={ref} className="bd-modal" role="dialog" aria-modal="true" aria-labelledby="bd-details-title">
        <header>
          <div>
            <h2 id="bd-details-title">Detalles del ejercicio</h2>
            <p className="bd-hint">
              {row.name} · {muscleGroupLabel(row.muscleGroup)}
            </p>
          </div>
        </header>
        <form
          className="bd-modal-body"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setAttempted(true);
            if (!isRowComplete({ sets: draft.sets, reps: draft.reps })) return;
            onSave(draft);
          }}
        >
          <div className="bd-fgrid">
            <div>
              <span className="bd-lbl">Series</span>
              <div className="bd-step">
                <button type="button" aria-label="Quitar una serie" onClick={() => patch({ sets: String(Math.max(1, (parseNumber(draft.sets) || 2) - 1)) })}>
                  −
                </button>
                <output aria-label="Series">{draft.sets || "–"}</output>
                <button type="button" aria-label="Sumar una serie" onClick={() => patch({ sets: String((parseNumber(draft.sets) || 0) + 1) })}>
                  +
                </button>
              </div>
            </div>
            <div>
              <label className="bd-lbl" htmlFor="bd-d-reps">
                Repeticiones
              </label>
              <input
                id="bd-d-reps"
                data-autofocus
                className={`bd-inp${repsMissing ? " bd-inp-bad" : ""}`}
                inputMode="numeric"
                aria-invalid={repsMissing || undefined}
                aria-describedby={repsMissing ? "bd-d-reps-err" : undefined}
                value={draft.reps}
                onChange={(e) => patch({ reps: e.target.value })}
              />
              {repsMissing && (
                <p id="bd-d-reps-err" className="bd-hint bd-hint-bad">
                  Indica cuántas repeticiones
                </p>
              )}
            </div>
            <div>
              <label className="bd-lbl" htmlFor="bd-d-weight">
                Peso (kg)
              </label>
              <input id="bd-d-weight" className="bd-inp" inputMode="decimal" value={draft.weight} onChange={(e) => patch({ weight: e.target.value })} />
              <p className="bd-hint">Vacío = peso corporal</p>
            </div>
            <div>
              <label className="bd-lbl" htmlFor="bd-d-rest">
                Descanso (s)
              </label>
              <input id="bd-d-rest" className="bd-inp" inputMode="numeric" value={draft.restSeconds} onChange={(e) => patch({ restSeconds: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="bd-lbl" htmlFor="bd-d-rir">
              Reps en reserva objetivo
            </label>
            <select id="bd-d-rir" className="bd-inp" value={draft.rir} onChange={(e) => patch({ rir: e.target.value })}>
              <option value="">Sin objetivo</option>
              {[0, 1, 2, 3, 4].map((value) => (
                <option key={value} value={value}>
                  {value === 4 ? "4 o más" : value}
                </option>
              ))}
            </select>
          </div>
          <footer>
            <button type="button" className="bd-btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="bd-btn bd-btn-p">
              Guardar
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
