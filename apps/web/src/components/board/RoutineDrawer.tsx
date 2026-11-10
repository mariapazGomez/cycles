import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as routinesApi from "../../services/routinesApi";
import * as exercisesApi from "../../services/exercisesApi";
import { ExercisePicker } from "../ExercisePicker";
import { SeriesStepper } from "../routine/SeriesStepper";
import { ExerciseDetailsDialog } from "./ExerciseDetailsDialog";
import { muscleGroupLabel } from "../../lib/muscleGroups";
import { isRowComplete } from "../../lib/routineStats";
import { hasDetails } from "../../lib/routineRows";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import { useRoutineDraft } from "../../hooks/useRoutineDraft";
import { useSaveRoutine } from "../../hooks/useSaveRoutine";
import { routineSummaryLine } from "../../lib/routineDraft";
import { dismissMovedNotice, shouldShowMovedNotice } from "../../lib/movedNotice";

// Cajón lateral para crear (o editar) una rutina sin salir de la pizarra: lo
// mínimo es nombre, ejercicios, series y reps; el resto va en «Detalles…».
export function RoutineDrawer({
  routine,
  onClose,
  onSaved,
  movedNotice = false,
}: {
  // Rutina a editar; sin ella, se crea una nueva.
  routine: routinesApi.RoutineDetail | null;
  onClose: () => void;
  onSaved: (routine: routinesApi.RoutineDetail, created: boolean) => void;
  // Aviso de una sola vez para quienes antes editaban en la página aparte (Biblioteca).
  movedNotice?: boolean;
}) {
  const [showNotice, setShowNotice] = useState(() => movedNotice && shouldShowMovedNotice());
  const ref = useRef<HTMLElement>(null);
  const draft = useRoutineDraft(routine);
  const { rows, error, attempted } = draft;
  const [detailsKey, setDetailsKey] = useState<string | null>(null);
  const exercisesQuery = useQuery({ queryKey: ["exercises"], queryFn: exercisesApi.listExercises });

  const [dialogOpen, setDialogOpen] = useState(false);
  // El diálogo de detalles es modal encima del cajón: mientras está abierto, el
  // cajón no atiende Escape ni captura el foco.
  useDialogFocus(ref as React.RefObject<HTMLElement>, () => {
    if (!dialogOpen) onClose();
  });

  const saveMutation = useSaveRoutine({
    routineId: routine?.id,
    via: "board",
    getPayload: draft.payload,
    exerciseCount: () => rows.length,
    onSaved,
    onError: draft.setError,
  });

  function submit() {
    if (draft.check()) saveMutation.mutate();
  }

  const detailsRow = rows.find((r) => r.key === detailsKey) ?? null;

  return (
    <>
      <div className="bd-scrim bd-scrim-drawer" onClick={onClose} />
      <section ref={ref} className="bd-drawer" role="dialog" aria-modal="true" aria-labelledby="bd-drawer-title" data-tour="drawer">
        <header>
          <h2 id="bd-drawer-title">{routine ? "Editar rutina" : "Crear rutina"}</h2>
          <button type="button" className="bd-ghost" onClick={onClose} aria-label="Cerrar">
            Cerrar
          </button>
        </header>
        <form
          className="bd-drawer-body"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          {showNotice && (
            <div className="bd-notice" role="status">
              <span>Ahora crear y editar rutinas se hace aquí, sin salir de la Biblioteca.</span>
              <button
                type="button"
                className="bd-ghost"
                onClick={() => {
                  dismissMovedNotice();
                  setShowNotice(false);
                }}
              >
                Entendido
              </button>
            </div>
          )}
          {routine && (
            <p className="bd-hint">Los cambios valen para las sesiones que agregues desde ahora. Las que ya están asignadas no cambian.</p>
          )}
          <div>
            <label className="bd-lbl" htmlFor="bd-r-name">
              Nombre
            </label>
            <input id="bd-r-name" data-autofocus data-tour="drawer-name" className="bd-inp" type="text" value={draft.name} onChange={(e) => draft.setName(e.target.value)} />
          </div>

          <div className="bd-drawer-ex" data-tour="drawer-exercises">
            <h3>Ejercicios</h3>
            {rows.length === 0 && <p className="bd-hint">Agrega el primer ejercicio y define series y reps.</p>}
            {rows.map((row, index) => {
              const missing = attempted && !isRowComplete(row);
              return (
                <div key={row.key} className="bd-xrow" data-tour="drawer-row">
                  <div className="bd-xt">
                    <b>{row.name}</b>
                    <span className="pill">{muscleGroupLabel(row.muscleGroup)}</span>
                    {hasDetails(row) && <span className="pill pill-blue">Con detalles</span>}
                    <button type="button" className="bd-ghost" aria-label={`Subir ${row.name}`} disabled={index === 0} onClick={() => draft.moveRow(index, -1)}>
                      ↑
                    </button>
                    <button type="button" className="bd-ghost" aria-label={`Bajar ${row.name}`} disabled={index === rows.length - 1} onClick={() => draft.moveRow(index, 1)}>
                      ↓
                    </button>
                    <button type="button" className="bd-ghost" aria-label={`Duplicar ${row.name}`} onClick={() => draft.duplicateRow(index)}>
                      Duplicar
                    </button>
                    <button type="button" className="bd-ghost" onClick={() => draft.removeRow(row.key)}>
                      Quitar
                    </button>
                  </div>
                  <div className="bd-xq">
                    <SeriesStepper prefix="bd" name={row.name} value={row.sets} onChange={(sets) => draft.updateRow(row.key, { sets })} />
                    <div>
                      <label className="bd-lbl" htmlFor={`bd-reps-${row.key}`}>
                        Reps
                      </label>
                      <input
                        id={`bd-reps-${row.key}`}
                        className={`bd-inp bd-inp-mini${missing ? " bd-inp-bad" : ""}`}
                        inputMode="numeric"
                        aria-invalid={missing || undefined}
                        value={row.reps}
                        onChange={(e) => draft.updateRow(row.key, { reps: e.target.value })}
                      />
                    </div>
                    <button
                      type="button"
                      className="bd-btn bd-btn-sm"
                      aria-label={`Detalles de ${row.name}`}
                      onClick={() => {
                        setDialogOpen(true);
                        setDetailsKey(row.key);
                      }}
                    >
                      Detalles…
                    </button>
                  </div>
                  {missing && <p className="bd-hint bd-hint-bad">Completa series y reps para guardar.</p>}
                </div>
              );
            })}
            <ExercisePicker
              exercises={exercisesQuery.data}
              isLoading={exercisesQuery.isLoading}
              isError={exercisesQuery.isError}
              onPick={draft.addExercise}
            />
            <button type="button" className="bd-btn bd-btn-sm" disabled title="Superseries y circuitos: pronto (CYC-108, CYC-109)">
              Agrupar en bloque · Pronto
            </button>
          </div>
        </form>
        <footer>
          {routineSummaryLine(draft.stats) && (
            <p className="bd-sum" aria-live="polite">
              {routineSummaryLine(draft.stats)}
            </p>
          )}
          <button type="button" className="bd-btn bd-btn-p" data-tour="drawer-save" disabled={saveMutation.isPending} onClick={submit}>
            {saveMutation.isPending ? "Guardando…" : routine ? "Guardar cambios" : "Guardar y usar"}
          </button>
          <button type="button" className="bd-btn" onClick={onClose}>
            Cancelar
          </button>
        </footer>
      </section>

      {detailsRow && (
        <ExerciseDetailsDialog
          row={detailsRow}
          onClose={() => {
            setDetailsKey(null);
            setDialogOpen(false);
          }}
          onSave={(patch) => {
            draft.updateRow(detailsRow.key, patch);
            setDetailsKey(null);
            setDialogOpen(false);
          }}
        />
      )}
    </>
  );
}

