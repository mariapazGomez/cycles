import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MuscleGroup } from "@cycles/shared";
import * as routinesApi from "../services/routinesApi";
import * as exercisesApi from "../services/exercisesApi";
import { ApiError } from "../services/httpClient";

const MUSCLE_GROUP_LABEL: Record<MuscleGroup, string> = {
  chest: "Pecho",
  back: "Espalda",
  legs: "Piernas",
  glutes: "Glúteos",
  shoulders: "Hombros",
  arms: "Brazos",
  core: "Core",
  cardio: "Cardio",
  other: "Otro",
};

interface ExerciseRow {
  exerciseId: string;
  defaultSets: string;
  defaultReps: string;
  defaultWeight: string;
  defaultRestSeconds: string;
  // Reps en reserva objetivo ("" = sin objetivo). Ver PRD-EjecucionYSeguimiento.
  defaultRir: string;
}

function emptyRow(): ExerciseRow {
  return { exerciseId: "", defaultSets: "", defaultReps: "", defaultWeight: "", defaultRestSeconds: "", defaultRir: "" };
}

function formatDefaults(re: routinesApi.RoutineExerciseWithExercise): string {
  const parts = [`${re.defaultSets}x${re.defaultReps}`];
  if (re.defaultWeight) parts.push(`${re.defaultWeight}kg`);
  if (re.defaultRir !== null && re.defaultRir !== undefined) parts.push(`${re.defaultRir} en reserva`);
  return parts.join(" · ");
}

export function RoutinesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [rows, setRows] = useState<ExerciseRow[]>([emptyRow()]);
  const [formError, setFormError] = useState<string | null>(null);

  const routinesQuery = useQuery({ queryKey: ["routines"], queryFn: routinesApi.listRoutines });
  const exercisesQuery = useQuery({ queryKey: ["exercises"], queryFn: exercisesApi.listExercises });

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setRows([emptyRow()]);
    setFormError(null);
  }

  function startEdit(routine: routinesApi.RoutineDetail) {
    setEditingId(routine.id);
    setName(routine.name);
    setRows(
      routine.routineExercises.map((re) => ({
        exerciseId: re.exerciseId,
        defaultSets: String(re.defaultSets),
        defaultReps: String(re.defaultReps),
        defaultWeight: re.defaultWeight ? String(re.defaultWeight) : "",
        defaultRestSeconds: re.defaultRestSeconds ? String(re.defaultRestSeconds) : "",
        defaultRir: re.defaultRir !== null && re.defaultRir !== undefined ? String(re.defaultRir) : "",
      })),
    );
    setShowForm(true);
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const exercises = rows
        .filter((r) => r.exerciseId)
        .map((r) => ({
          exerciseId: r.exerciseId,
          defaultSets: Number(r.defaultSets),
          defaultReps: Number(r.defaultReps),
          defaultWeight: r.defaultWeight ? Number(r.defaultWeight) : undefined,
          defaultRestSeconds: r.defaultRestSeconds ? Number(r.defaultRestSeconds) : undefined,
          defaultRir: r.defaultRir !== "" ? Number(r.defaultRir) : undefined,
        }));
      return editingId
        ? routinesApi.updateRoutine(editingId, { name, exercises })
        : routinesApi.createRoutine({ name, exercises });
    },
    onSuccess: () => {
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["routines"] });
    },
    onError: (error: unknown) => {
      setFormError(error instanceof ApiError ? error.message : "No se pudo guardar la rutina.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => routinesApi.deleteRoutine(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["routines"] }),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (rows.filter((r) => r.exerciseId).length === 0) {
      setFormError("Agrega al menos un ejercicio.");
      return;
    }
    saveMutation.mutate();
  }

  function updateRow(index: number, patch: Partial<ExerciseRow>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-title">Rutinas</h1>
        </div>
        <button
          type="button"
          className="button-primary"
          style={{ width: "auto" }}
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
        >
          {showForm ? "Cancelar" : "Crear rutina"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} noValidate style={{ maxWidth: 560, marginTop: 24 }}>
          {formError && <div className="error-banner">{formError}</div>}

          <div className="field">
            <label htmlFor="routineName">Nombre</label>
            <input
              id="routineName"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {rows.map((row, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-end",
                marginBottom: 12,
                flexWrap: "wrap",
              }}
            >
              <div className="field" style={{ flex: 2, minWidth: 180, marginBottom: 0 }}>
                {index === 0 && <label>Ejercicio</label>}
                <select
                  required
                  value={row.exerciseId}
                  onChange={(e) => updateRow(index, { exerciseId: e.target.value })}
                >
                  <option value="" disabled>
                    Elige un ejercicio
                  </option>
                  {(exercisesQuery.data ?? []).map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name}
                      {exercise.muscleGroup ? ` (${MUSCLE_GROUP_LABEL[exercise.muscleGroup]})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ width: 70, marginBottom: 0 }}>
                {index === 0 && <label>Series</label>}
                <input
                  type="number"
                  min={1}
                  required
                  value={row.defaultSets}
                  onChange={(e) => updateRow(index, { defaultSets: e.target.value })}
                />
              </div>
              <div className="field" style={{ width: 70, marginBottom: 0 }}>
                {index === 0 && <label>Reps</label>}
                <input
                  type="number"
                  min={1}
                  required
                  value={row.defaultReps}
                  onChange={(e) => updateRow(index, { defaultReps: e.target.value })}
                />
              </div>
              <div className="field" style={{ width: 80, marginBottom: 0 }}>
                {index === 0 && <label>Kg</label>}
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={row.defaultWeight}
                  onChange={(e) => updateRow(index, { defaultWeight: e.target.value })}
                />
              </div>
              <div className="field" style={{ width: 90, marginBottom: 0 }}>
                {index === 0 && <label>Descanso (s)</label>}
                <input
                  type="number"
                  min={0}
                  value={row.defaultRestSeconds}
                  onChange={(e) => updateRow(index, { defaultRestSeconds: e.target.value })}
                />
              </div>
              <div className="field" style={{ width: 110, marginBottom: 0 }}>
                {index === 0 && <label htmlFor={`rir-${index}`}>En reserva</label>}
                <select
                  id={`rir-${index}`}
                  aria-label="Reps en reserva objetivo"
                  value={row.defaultRir}
                  onChange={(e) => updateRow(index, { defaultRir: e.target.value })}
                >
                  <option value="">Sin objetivo</option>
                  {[0, 1, 2, 3, 4].map((value) => (
                    <option key={value} value={value}>
                      {value === 4 ? "4 o más" : value}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="button-secondary"
                style={{ width: "auto", padding: "10px 12px" }}
                onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                disabled={rows.length === 1}
              >
                Quitar
              </button>
            </div>
          ))}

          <button
            type="button"
            className="button-secondary"
            style={{ width: "auto", marginBottom: 16 }}
            onClick={() => setRows((current) => [...current, emptyRow()])}
          >
            + Agregar ejercicio
          </button>

          <div>
            <button
              type="submit"
              className="button-primary"
              style={{ width: "auto" }}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Guardando…" : editingId ? "Guardar cambios" : "Crear rutina"}
            </button>
          </div>
        </form>
      )}

      <div style={{ marginTop: 32 }}>
        {routinesQuery.isLoading && <p>Cargando…</p>}
        {routinesQuery.data && routinesQuery.data.length === 0 && (
          <p>Todavía no armaste ninguna rutina.</p>
        )}

        {routinesQuery.data && routinesQuery.data.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {routinesQuery.data.map((routine) => (
              <li
                key={routine.id}
                style={{
                  padding: "12px 0",
                  borderBottom: "1px solid var(--color-gray-border)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>{routine.name}</strong>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="button-secondary"
                      style={{ width: "auto", padding: "6px 12px" }}
                      onClick={() => startEdit(routine)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="button-secondary"
                      style={{ width: "auto", padding: "6px 12px" }}
                      onClick={() => deleteMutation.mutate(routine.id)}
                      disabled={deleteMutation.isPending}
                    >
                      Borrar
                    </button>
                  </div>
                </div>
                <p style={{ margin: "4px 0 0", color: "var(--color-ink-secondary)", fontSize: "0.88rem" }}>
                  {routine.routineExercises.map((re) => `${re.exercise.name} (${formatDefaults(re)})`).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
