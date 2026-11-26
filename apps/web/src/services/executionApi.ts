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

// Una entrada por ciclo activo (CYC-314): lo que toca (las de hoy o, si no hay, la siguiente
// pendiente) y lo que ya se cerró hoy.
export interface TodayCycleEntry {
  cycle: TodayResponse["cycle"];
  pending: TodayResponse["session"][];
  upcoming: boolean;
  done: { id: string; name: string; weekNumber: number; slotNumber: number; exercises: { done: number; total: number } }[];
}

// `date` y `since` describen el día local de quien entrena.
export function getTodayCycles(date: string, since: string) {
  return apiRequest<{ cycles: TodayCycleEntry[] }>(`/me/today/cycles?date=${date}&since=${encodeURIComponent(since)}`);
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

// El atleta elige (o quita, con `null`) el día de una sesión pendiente. El día
// debe caer dentro de las fechas del ciclo.
export function scheduleSession(sessionId: string, date: string | null) {
  return apiRequest<TrainingSession>(`/sessions/${sessionId}/schedule`, {
    method: "PATCH",
    body: { date },
  });
}
