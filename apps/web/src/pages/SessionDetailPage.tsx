import { FormEvent, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MuscleGroup, SessionStatus } from "@cycles/shared";
import * as sessionsApi from "../services/sessionsApi";
import * as exercisesApi from "../services/exercisesApi";
import { useAuth } from "../hooks/useAuth";
import { ApiError } from "../services/httpClient";
import { LoadingScreen } from "../components/LoadingScreen";

const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  pending: "Pendiente",
  completed: "Completada",
  skipped: "Salteada",
};

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatTargets(se: sessionsApi.SessionExerciseWithExercise): string {
  const parts = [`${se.targetSets}x${se.targetReps}`];
  if (se.targetWeight) parts.push(`${se.targetWeight}kg`);
  if (se.targetRestSeconds) parts.push(`${se.targetRestSeconds}s descanso`);
  return parts.join(" · ");
}

export function SessionDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isCoach = user?.role === "coach";
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({ queryKey: ["sessions", id], queryFn: () => sessionsApi.getSession(id) });
  const exercisesQuery = useQuery({
    queryKey: ["exercises"],
    queryFn: exercisesApi.listExercises,
    enabled: isCoach,
  });

  const [showEdit, setShowEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function invalidateSession() {
    queryClient.invalidateQueries({ queryKey: ["sessions", id] });
  }

  const updateSessionMutation = useMutation({
    mutationFn: (data: Parameters<typeof sessionsApi.updateSession>[1]) =>
      sessionsApi.updateSession(id, data),
    onSuccess: () => {
      setShowEdit(false);
      invalidateSession();
    },
    onError: (error: unknown) => {
      setEditError(error instanceof ApiError ? error.message : "No se pudo actualizar la sesión.");
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: () => sessionsApi.deleteSession(id),
    onSuccess: () => {
      if (sessionQuery.data) {
        navigate(`/cycles/${sessionQuery.data.cycleId}`);
      }
    },
    onError: (error: unknown) => {
      setDeleteError(error instanceof ApiError ? error.message : "No se pudo borrar la sesión.");
    },
  });

  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [exerciseId, setExerciseId] = useState("");
  const [targetSets, setTargetSets] = useState("");
  const [targetReps, setTargetReps] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [targetRestSeconds, setTargetRestSeconds] = useState("");
  const [exerciseError, setExerciseError] = useState<string | null>(null);

  const addExerciseMutation = useMutation({
    mutationFn: () =>
      sessionsApi.addExercise(id, {
        exerciseId,
        targetSets: Number(targetSets),
        targetReps: Number(targetReps),
        targetWeight: targetWeight ? Number(targetWeight) : undefined,
        targetRestSeconds: targetRestSeconds ? Number(targetRestSeconds) : undefined,
      }),
    onSuccess: () => {
      setShowExerciseForm(false);
      setExerciseId("");
      setTargetSets("");
      setTargetReps("");
      setTargetWeight("");
      setTargetRestSeconds("");
      invalidateSession();
    },
    onError: (error: unknown) => {
      setExerciseError(error instanceof ApiError ? error.message : "No se pudo agregar el ejercicio.");
    },
  });

  const removeExerciseMutation = useMutation({
    mutationFn: (sessionExerciseId: string) => sessionsApi.removeExercise(sessionExerciseId),
    onSuccess: invalidateSession,
    onError: (error: unknown) => {
      setExerciseError(error instanceof ApiError ? error.message : "No se pudo quitar el ejercicio.");
    },
  });

  if (sessionQuery.isLoading) return <LoadingScreen />;
  if (sessionQuery.isError || !sessionQuery.data) {
    return <div className="error-banner">No se pudo cargar esta sesión.</div>;
  }

  const session = sessionQuery.data;

  function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEditError(null);
    const form = new FormData(event.currentTarget);
    const scheduledDate = String(form.get("scheduledDate") || "");
    updateSessionMutation.mutate({
      name: String(form.get("name")),
      status: form.get("status") as SessionStatus,
      ...(scheduledDate ? { scheduledDate } : {}),
    });
  }

  function handleExerciseSubmit(event: FormEvent) {
    event.preventDefault();
    setExerciseError(null);
    addExerciseMutation.mutate();
  }

  return (
    <div>
      <p style={{ marginBottom: 4 }}>
        <Link
          to={`/cycles/${session.cycleId}`}
          style={{ color: "var(--color-ink-secondary)", fontSize: "0.85rem" }}
        >
          ← {session.cycle.name}
        </Link>
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", marginBottom: 4 }}>{session.name}</h1>
          <p style={{ color: "var(--color-ink-secondary)", fontSize: "0.9rem" }}>
            {session.scheduledDate && `${formatDate(session.scheduledDate)} · `}
            {SESSION_STATUS_LABEL[session.status]}
          </p>
        </div>
        {isCoach && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="button-secondary"
              style={{ width: "auto" }}
              onClick={() => setShowEdit((v) => !v)}
            >
              {showEdit ? "Cancelar" : "Editar"}
            </button>
            <button
              type="button"
              className="button-secondary"
              style={{ width: "auto" }}
              onClick={() => {
                setDeleteError(null);
                deleteSessionMutation.mutate();
              }}
              disabled={deleteSessionMutation.isPending}
            >
              Borrar sesión
            </button>
          </div>
        )}
      </div>

      {deleteError && <div className="error-banner">{deleteError}</div>}

      {showEdit && (
        <form onSubmit={handleEditSubmit} noValidate style={{ maxWidth: 360, marginTop: 20 }}>
          {editError && <div className="error-banner">{editError}</div>}

          <div className="field">
            <label htmlFor="editSessionName">Nombre</label>
            <input id="editSessionName" name="name" type="text" required defaultValue={session.name} />
          </div>

          <div className="field">
            <label htmlFor="editSessionDate">Fecha planificada</label>
            <input
              id="editSessionDate"
              name="scheduledDate"
              type="date"
              defaultValue={session.scheduledDate?.slice(0, 10) ?? ""}
            />
          </div>

          <div className="field">
            <label htmlFor="editSessionStatus">Estado</label>
            <select id="editSessionStatus" name="status" defaultValue={session.status}>
              {Object.entries(SESSION_STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="button-primary"
            style={{ width: "auto" }}
            disabled={updateSessionMutation.isPending}
          >
            {updateSessionMutation.isPending ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>
      )}

      <div style={{ marginTop: 32, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "1.1rem", margin: 0 }}>Ejercicios</h2>
        {isCoach && (
          <button
            type="button"
            className="button-secondary"
            style={{ width: "auto" }}
            onClick={() => setShowExerciseForm((v) => !v)}
          >
            {showExerciseForm ? "Cancelar" : "Agregar ejercicio"}
          </button>
        )}
      </div>

      {exerciseError && <div className="error-banner">{exerciseError}</div>}

      {showExerciseForm && (
        <form onSubmit={handleExerciseSubmit} noValidate style={{ maxWidth: 420, marginTop: 16 }}>
          <div className="field">
            <label htmlFor="exercisePick">Ejercicio</label>
            <select
              id="exercisePick"
              required
              value={exerciseId}
              onChange={(e) => setExerciseId(e.target.value)}
            >
              <option value="" disabled>
                Elige un ejercicio del catálogo
              </option>
              {(exercisesQuery.data ?? []).map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                  {exercise.muscleGroup ? ` (${MUSCLE_GROUP_LABEL[exercise.muscleGroup]})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="targetSets">Series</label>
              <input
                id="targetSets"
                type="number"
                min={1}
                required
                value={targetSets}
                onChange={(e) => setTargetSets(e.target.value)}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="targetReps">Repeticiones</label>
              <input
                id="targetReps"
                type="number"
                min={1}
                required
                value={targetReps}
                onChange={(e) => setTargetReps(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="targetWeight">Peso en kg (opcional)</label>
              <input
                id="targetWeight"
                type="number"
                min={0}
                step="0.5"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="targetRest">Descanso en segundos (opcional)</label>
              <input
                id="targetRest"
                type="number"
                min={0}
                value={targetRestSeconds}
                onChange={(e) => setTargetRestSeconds(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="button-primary"
            style={{ width: "auto" }}
            disabled={addExerciseMutation.isPending}
          >
            {addExerciseMutation.isPending ? "Agregando…" : "Agregar ejercicio"}
          </button>
        </form>
      )}

      <div style={{ marginTop: 16 }}>
        {session.sessionExercises.length === 0 && <p>Todavía no hay ejercicios en esta sesión.</p>}

        {session.sessionExercises.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {session.sessionExercises.map((se) => (
              <li
                key={se.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 0",
                  borderBottom: "1px solid var(--color-gray-border)",
                }}
              >
                <span>
                  <strong>{se.exercise.name}</strong>{" "}
                  <span style={{ color: "var(--color-ink-secondary)" }}>{formatTargets(se)}</span>
                </span>
                {isCoach && (
                  <button
                    type="button"
                    className="button-secondary"
                    style={{ width: "auto", padding: "6px 12px" }}
                    onClick={() => removeExerciseMutation.mutate(se.id)}
                    disabled={removeExerciseMutation.isPending}
                  >
                    Quitar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
