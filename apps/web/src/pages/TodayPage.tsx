import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as executionApi from "../services/executionApi";
import { ApiError } from "../services/httpClient";
import { EmptyState } from "../components/EmptyState";
import { ExerciseList } from "../components/today/ExerciseList";
import { TodayCycles } from "../components/today/TodayCycles";
import { toLocalDay } from "../lib/calendar";
import { track } from "../lib/analytics";
import { useAuth } from "../hooks/useAuth";
import * as cyclesApi from "../services/cyclesApi";

// Inicio del atleta: la próxima sesión pendiente de su plan activo.
export function TodayPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const todayQuery = useQuery({ queryKey: ["today"], queryFn: executionApi.getToday });
  // Con dos o más ciclos a la vez se muestran todos (CYC-314). Con uno solo, «Hoy» queda como siempre.
  const now = new Date();
  const todayIso = toLocalDay(now);
  const cyclesTodayQuery = useQuery({
    queryKey: ["today", "cycles", todayIso],
    queryFn: () => executionApi.getTodayCycles(todayIso, new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()),
    retry: false,
  });
  // Solo para distinguir «sin ciclo todavía» de «hoy no hay sesión».
  const cyclesQuery = useQuery({ queryKey: ["cycles"], queryFn: cyclesApi.listCycles, enabled: todayQuery.isSuccess && !todayQuery.data });
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
      track("session_closed", { outcome: "skipped" });
      setSkipping(false);
      queryClient.invalidateQueries({ queryKey: ["today"] });
    },
    onError: (err: unknown) => setError(err instanceof ApiError ? err.message : "No se pudo marcar como omitida."),
  });

  // Se registró solo y ningún coach lo ha vinculado todavía.
  if (user?.hasActiveCoach === false) {
    return (
      <div className="log-shell">
        <EmptyState title="Falta tu coach">
          Pídele a tu coach que te invite a Cycles con el correo {user.email}. Cuando aceptes la invitación, tus
          entrenamientos aparecerán aquí.
        </EmptyState>
      </div>
    );
  }

  if (todayQuery.isLoading || cyclesTodayQuery.isLoading) return <p>Cargando…</p>;
  if (todayQuery.isError) return <div className="error-banner">No se pudo cargar tu próxima sesión.</div>;

  // Si no se pudo pedir, se muestra la vista de siempre.
  const byCycle = cyclesTodayQuery.data?.cycles ?? [];
  if (byCycle.length >= 2) return <TodayCycles entries={byCycle} todayIso={todayIso} />;

  const today = todayQuery.data;
  if (!today) {
    // Con coach pero sin ningún ciclo: el coach está preparándolo. Con ciclo: hoy toca descansar.
    const noCycle = cyclesQuery.isSuccess && cyclesQuery.data.length === 0;
    return (
      <div className="log-shell">
        {noCycle ? (
          <EmptyState title="Tu coach está preparando tu ciclo">Cuando te asigne tu primera sesión, la verás aquí.</EmptyState>
        ) : (
          <EmptyState title="Hoy no tienes sesión">Descansa.</EmptyState>
        )}
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

      <ExerciseList exercises={session.sessionExercises} />

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
