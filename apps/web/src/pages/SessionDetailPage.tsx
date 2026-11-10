import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { SessionStatus } from "@cycles/shared";
import * as sessionsApi from "../services/sessionsApi";
import { useAuth } from "../hooks/useAuth";
import { LoadingScreen } from "../components/LoadingScreen";
import { CoachNote } from "../components/ExerciseNote";
import { SessionBlocks } from "../components/SessionBlocks";
import { groupByBlock, sessionSummary } from "../lib/workBlocks";
import { SessionBuilderPage } from "./SessionBuilderPage";

const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  pending: "Pendiente",
  completed: "Completada",
  skipped: "Salteada",
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

// La sesión: el coach la ve y edita en el constructor por bloques (SessionBuilderPage);
// el atleta la ve de solo lectura, también por bloques.
export function SessionDetailPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const sessionQuery = useQuery({ queryKey: ["sessions", id], queryFn: () => sessionsApi.getSession(id) });

  if (sessionQuery.isLoading) return <LoadingScreen />;
  if (sessionQuery.isError || !sessionQuery.data) {
    return <div className="error-banner">No se pudo cargar esta sesión.</div>;
  }

  const session = sessionQuery.data;
  if (user?.role === "coach") return <SessionBuilderPage key={session.id} session={session} />;

  const groups = groupByBlock(session.blocks, session.sessionExercises);

  return (
    <div>
      <p style={{ marginBottom: 4 }}>
        <Link to={`/cycles/${session.cycleId}`} style={{ color: "var(--color-ink-secondary)", fontSize: "0.85rem" }}>
          ← {session.cycle.name}
        </Link>
      </p>
      <h1 style={{ fontFamily: "var(--font-display)", marginBottom: 4 }}>{session.name}</h1>
      <p style={{ color: "var(--color-ink-secondary)", fontSize: "0.9rem" }}>
        {session.scheduledDate && `${formatDate(session.scheduledDate)} · `}
        {SESSION_STATUS_LABEL[session.status]}
      </p>

      <h2 style={{ fontSize: "1.1rem", margin: "32px 0 0" }}>Ejercicios</h2>
      <div style={{ marginTop: 16 }}>
        {session.sessionExercises.length === 0 && <p>Todavía no hay ejercicios en esta sesión.</p>}
        {session.sessionExercises.length > 0 && (
          <>
            <p className="session-blocks__summary">{sessionSummary(groups)}</p>
            <SessionBlocks
              groups={groups}
              renderExercise={(se) => (
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span>
                    <strong>{se.exercise.name}</strong> <span style={{ color: "var(--color-ink-secondary)" }}>{formatTargets(se)}</span>
                  </span>
                  <div style={{ flexBasis: "100%" }}>
                    <CoachNote note={se.note} />
                  </div>
                </div>
              )}
            />
          </>
        )}
      </div>
    </div>
  );
}
