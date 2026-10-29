import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Exercise } from "@cycles/shared";
import * as routinesApi from "../../services/routinesApi";
import * as exercisesApi from "../../services/exercisesApi";
import { ApiError } from "../../services/httpClient";
import { ExercisePicker } from "../ExercisePicker";
import { ExerciseDetailsDialog } from "./ExerciseDetailsDialog";
import { muscleGroupLabel } from "../../lib/muscleGroups";
import { isRowComplete, parseNumber } from "../../lib/routineStats";
import { DEFAULT_SETS, hasDetails, rowFromRoutine, toInput, type Row } from "../../lib/routineRows";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import { track } from "../../lib/analytics";

// Cajón lateral para crear (o editar) una rutina sin salir de la pizarra: lo
// mínimo es nombre, ejercicios, series y reps; el resto va en «Detalles…».
export function RoutineDrawer({
  routine,
  onClose,
  onSaved,
}: {
  // Rutina a editar; sin ella, se crea una nueva.
  routine: routinesApi.RoutineDetail | null;
  onClose: () => void;
  onSaved: (routine: routinesApi.RoutineDetail, created: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const ref = useRef<HTMLElement>(null);
  const keyCounter = useRef(0);
  const nextKey = () => `drawer-row-${++keyCounter.current}`;
  const [name, setName] = useState(routine?.name ?? "");
  const [rows, setRows] = useState<Row[]>(() =>
    (routine?.routineExercises ?? []).map((re) => rowFromRoutine(`drawer-row-${re.id ?? re.exerciseId}`, re)),
  );
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [detailsKey, setDetailsKey] = useState<string | null>(null);
  const exercisesQuery = useQuery({ queryKey: ["exercises"], queryFn: exercisesApi.listExercises });

  const [dialogOpen, setDialogOpen] = useState(false);
  // El diálogo de detalles es modal encima del cajón: mientras está abierto, el
  // cajón no atiende Escape ni captura el foco.
  useDialogFocus(ref as React.RefObject<HTMLElement>, () => {
    if (!dialogOpen) onClose();
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const data = { name: name.trim(), exercises: rows.map(toInput) };
      return routine ? routinesApi.updateRoutine(routine.id, data) : routinesApi.createRoutine(data);
    },
    onSuccess: (saved) => {
      if (!routine) track("routine_created", { exercises: rows.length, via: "board" });
      queryClient.invalidateQueries({ queryKey: ["routines"] });
      onSaved(saved, !routine);
    },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : "No se pudo guardar la rutina."),
  });

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addExercise(exercise: Exercise) {
    setRows((current) => [
      ...current,
      { key: nextKey(), exerciseId: exercise.id, name: exercise.name, muscleGroup: exercise.muscleGroup, sets: DEFAULT_SETS, reps: "", weight: "", restSeconds: "", rir: "" },
    ]);
  }

  function submit() {
    setError(null);
    setAttempted(true);
    if (!name.trim()) return setError("Ponle un nombre a la rutina.");
    if (rows.length === 0) return setError("Agrega al menos un ejercicio.");
    if (rows.some((r) => !isRowComplete(r))) return setError("Completa series y reps de todos los ejercicios.");
    saveMutation.mutate();
  }

  const detailsRow = rows.find((r) => r.key === detailsKey) ?? null;
  const editorPath = routine ? `/routines/${routine.id}` : "/routines/new";

  return (
    <>
      <div className="bd-scrim bd-scrim-drawer" onClick={onClose} />
      <section ref={ref} className="bd-drawer" role="dialog" aria-modal="true" aria-labelledby="bd-drawer-title">
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
          {routine && (
            <p className="bd-hint">Los cambios valen para las sesiones que agregues desde ahora. Las que ya están asignadas no cambian.</p>
          )}
          <div>
            <label className="bd-lbl" htmlFor="bd-r-name">
              Nombre
            </label>
            <input id="bd-r-name" data-autofocus className="bd-inp" type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="bd-drawer-ex">
            <h3>Ejercicios</h3>
            {rows.length === 0 && <p className="bd-hint">Agrega el primer ejercicio y define series y reps.</p>}
            {rows.map((row) => {
              const missing = attempted && !isRowComplete(row);
              return (
                <div key={row.key} className="bd-xrow">
                  <div className="bd-xt">
                    <b>{row.name}</b>
                    <span className="pill">{muscleGroupLabel(row.muscleGroup)}</span>
                    {hasDetails(row) && <span className="pill pill-blue">Con detalles</span>}
                    <button type="button" className="bd-ghost" onClick={() => setRows((cur) => cur.filter((r) => r.key !== row.key))}>
                      Quitar
                    </button>
                  </div>
                  <div className="bd-xq">
                    <div>
                      <span className="bd-lbl">Series</span>
                      <div className="bd-step">
                        <button type="button" aria-label={`Quitar una serie de ${row.name}`} onClick={() => updateRow(row.key, { sets: String(Math.max(1, (parseNumber(row.sets) || 2) - 1)) })}>
                          −
                        </button>
                        <output aria-label={`Series de ${row.name}`}>{row.sets || "–"}</output>
                        <button type="button" aria-label={`Sumar una serie a ${row.name}`} onClick={() => updateRow(row.key, { sets: String((parseNumber(row.sets) || 0) + 1) })}>
                          +
                        </button>
                      </div>
                    </div>
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
                        onChange={(e) => updateRow(row.key, { reps: e.target.value })}
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
              onPick={addExercise}
            />
            <button type="button" className="bd-btn bd-btn-sm" disabled title="Superseries y circuitos: pronto (CYC-108, CYC-109)">
              Agrupar en bloque · Pronto
            </button>
          </div>
        </form>
        <footer>
          <button type="button" className="bd-btn bd-btn-p" disabled={saveMutation.isPending} onClick={submit}>
            {saveMutation.isPending ? "Guardando…" : routine ? "Guardar cambios" : "Guardar y usar"}
          </button>
          <button type="button" className="bd-btn" onClick={onClose}>
            Cancelar
          </button>
          <Link to={editorPath} className="bd-link">
            Abrir en el editor completo
          </Link>
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
            updateRow(detailsRow.key, patch);
            setDetailsKey(null);
            setDialogOpen(false);
          }}
        />
      )}
    </>
  );
}

