import type {
  Exercise,
  ExerciseLog,
  SessionExercise,
  SessionFeedback,
  TrainingCycle,
  TrainingSession,
} from '@cycles/shared';
import { apiRequest } from './httpClient';
import type { MuscleDay } from '../utils/muscleSummary';

export function fetchActiveCycles() {
  return apiRequest<TrainingCycle[]>('/cycles?status=active');
}

export function fetchCycleSessions(cycleId: string) {
  return apiRequest<TrainingSession[]>(`/cycles/${cycleId}/sessions`);
}

// Una sesión con sus ejercicios, las series registradas y el cierre vigente
// (`feedback` trae como mucho uno: el que no fue corregido ni anulado).
export interface SessionDetail extends TrainingSession {
  cycle: TrainingCycle;
  sessionExercises: Array<SessionExercise & { exercise: Exercise; logs: ExerciseLog[] }>;
  feedback: SessionFeedback[];
}

export function fetchSessionDetail(sessionId: string) {
  return apiRequest<SessionDetail>(`/sessions/${sessionId}`);
}

// Series y carga por grupo muscular de cada sesión entrenada del plan.
export function fetchMuscleSummary(cycleId: string) {
  return apiRequest<{ cycleId: string; days: MuscleDay[] }>(`/me/summary?cycleId=${cycleId}`);
}
