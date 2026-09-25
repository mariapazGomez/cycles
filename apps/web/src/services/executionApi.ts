import type {
  Exercise,
  ExerciseLog,
  SessionExercise,
  SessionFeedback,
  SessionOutcome,
  TrainingSession,
} from "@cycles/shared";
import { apiRequest } from "./httpClient";

// Registro de ejecución del atleta — ver docs/prds/features/PRD-EjecucionYSeguimiento.md.

export interface SessionExerciseWithLogs extends SessionExercise {
  exercise: Exercise;
  logs: ExerciseLog[];
}

export interface TodayResponse {
  cycle: { id: string; name: string; currentWeek: number };
  session: TrainingSession & { sessionExercises: SessionExerciseWithLogs[] };
}

export function getToday() {
  return apiRequest<TodayResponse | null>("/me/today");
}

export function startSession(sessionId: string) {
  return apiRequest<TrainingSession>(`/sessions/${sessionId}/start`, { method: "POST" });
}

export interface LogSetInput {
  // Generado en el cliente: un reintento con el mismo id no duplica la serie.
  id: string;
  setNumber: number;
  actualReps: number;
  actualWeight?: number;
  rir?: number;
  supersedesId?: string;
}

export function logSet(sessionExerciseId: string, data: LogSetInput) {
  return apiRequest<ExerciseLog>(`/session-exercises/${sessionExerciseId}/logs`, {
    method: "POST",
    body: data,
  });
}

export interface FeedbackInput {
  outcome: SessionOutcome;
  srpe?: number;
  durationMinutes?: number;
  pain?: boolean;
  painNotes?: string;
  notes?: string;
  supersedesId?: string;
}

export function submitFeedback(sessionId: string, data: FeedbackInput) {
  return apiRequest<SessionFeedback>(`/sessions/${sessionId}/feedback`, {
    method: "POST",
    body: data,
  });
}
