import type { SessionFeedback, SessionOutcome, TodaySession, TrainingSession } from '@cycles/shared';
import { apiRequest } from './httpClient';

// `date` es el día local del atleta (AAAA-MM-DD): el servidor no conoce su
// zona horaria, así que la app dice qué día es hoy. Con `sessionId` pide esa
// sesión pendiente en vez de la primera del plan.
export function fetchToday(opts: { date?: string; sessionId?: string } = {}) {
  const params = Object.entries(opts)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${encodeURIComponent(value as string)}`)
    .join('&');
  return apiRequest<TodaySession | null>(`/me/today${params ? `?${params}` : ''}`);
}

// El coach define cuántas sesiones por semana; el atleta elige el día de cada
// una. `date` null quita el día asignado.
export function scheduleSession(sessionId: string, date: string | null) {
  return apiRequest<TrainingSession>(`/sessions/${sessionId}/schedule`, {
    method: 'PATCH',
    body: { date },
  });
}

export function startSession(sessionId: string) {
  return apiRequest<TrainingSession>(`/sessions/${sessionId}/start`, { method: 'POST' });
}

export interface LogSetInput {
  id: string;
  setNumber: number;
  actualReps: number;
  actualWeight?: number;
  rir?: number;
  supersedesId?: string;
}

export function logSet(sessionExerciseId: string, input: LogSetInput) {
  return apiRequest(`/session-exercises/${sessionExerciseId}/logs`, {
    method: 'POST',
    body: input,
  });
}

export interface SubmitFeedbackInput {
  outcome: SessionOutcome;
  srpe?: number;
  durationMinutes?: number;
  pain?: boolean;
  painNotes?: string;
  notes?: string;
  supersedesId?: string;
}

export function submitFeedback(sessionId: string, input: SubmitFeedbackInput) {
  return apiRequest<SessionFeedback>(`/sessions/${sessionId}/feedback`, {
    method: 'POST',
    body: input,
  });
}
