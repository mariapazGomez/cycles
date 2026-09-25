import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as executionApi from "../services/executionApi";
import { ApiError } from "../services/httpClient";
import { formatKg } from "../lib/format";

// Inicio del atleta: la próxima sesión pendiente de su plan activo.
export function TodayPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const todayQuery = useQuery({ queryKey: ["today"], queryFn: executionApi.getToday });
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startMutation = useMutation({
    mutationFn: (sessionId: string) => executionApi.startSession(sessionId),
    onSuccess: (_, sessionId) => navigate(`/sessions/${sessionId}/registro`),
    onError: (err: unknown) => setError(err instanceof ApiError ? err.message : "No se pudo empezar la sesión."),
  });

  const skipMutation = useMutation({
    mutationFn: ({ sessionId, notes }: { sessionId: string; notes?: string }) =>
      executionApi.submitFeedback(sessionId, { outcome: "skipped", notes }),
    onSuccess: () => {
      setSkipping(false);
      queryClient.invalidateQueries({ queryKey: ["today"] });
    },
    onError: (err: unknown) => setError(err instanceof ApiError ? err.message : "No se pudo marcar como omitida."),
  });

  if (todayQuery.isLoading) return <p>Cargando…</p>;
  if (todayQuery.isError) return <div className="error-banner">No se pudo cargar tu próxima sesión.</div>;

  const today = todayQuery.data;
  if (!today) {
    return (
      <div className="log-shell">
        <h1 className="page-title">Todo al día</h1>
        <p>Todavía no tienes sesiones pendientes. Cuando tu coach te asigne una, aparecerá aquí.</p>
      </div>
    );
  }

  const { session } = today;
  const started = Boolean(session.startedAt);

  function handleSkip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const notes = String(new FormData(event.currentTarget).get("reason") || "").trim();
    skipMutation.mutate({ sessionId: session.id, notes: notes || undefined });
  }

  return (
    <div className="log-shell">
      <div className="stack" style={{ gap: 10 }}>
        <h1 className="page-title">Te toca {session.name}</h1>
        <div className="row">
          <span className="pill">
            Semana {session.weekNumber}, sesión {session.slotNumber}
          </span>
          {started && <span className="pill pill-blue">En curso</span>}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <ul className="today-list">
        {session.sessionExercises.map((se) => (
          <li key={se.id}>
            <span>{se.exercise.name}</span>
            <span>
              {se.targetSets} × {se.targetReps} · {formatKg(se.targetWeight)}
            </span>
          </li>
        ))}
      </ul>

      {skipping ? (
        <form onSubmit={handleSkip} noValidate className="stack" style={{ gap: 12 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="skipReason">¿Por qué no puedes entrenar? (opcional)</label>
            <textarea id="skipReason" name="reason" rows={2} />
          </div>
          <button type="submit" className="button-primary button-big" disabled={skipMutation.isPending}>
            {skipMutation.isPending ? "Guardando…" : "Marcar como omitida"}
          </button>
          <button type="button" className="button-secondary" onClick={() => setSkipping(false)}>
            Cancelar
          </button>
        </form>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          <button
            type="button"
            className="button-primary button-big"
            disabled={startMutation.isPending}
            onClick={() => (started ? navigate(`/sessions/${session.id}/registro`) : startMutation.mutate(session.id))}
          >
            {started ? "Seguir registrando" : startMutation.isPending ? "Empezando…" : "Empezar sesión"}
          </button>
          {!started && (
            <button type="button" className="button-ghost" style={{ justifyContent: "center" }} onClick={() => setSkipping(true)}>
              No puedo entrenar hoy
            </button>
          )}
        </div>
      )}
    </div>
  );
}
