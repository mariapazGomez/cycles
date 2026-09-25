import type { SessionFeedback, SessionOutcome, TodaySession, TrainingSession } from '@cycles/shared';
import { apiRequest } from './httpClient';

export function fetchToday() {
  return apiRequest<TodaySession | null>('/me/today');
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
