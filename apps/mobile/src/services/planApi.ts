import type {
  Exercise,
  ExerciseProgress,
  ExerciseProgressResponse,
  ExerciseLog,
  SessionExercise,
  SessionFeedback,
  TrainingCycle,
  TrainingSession,
} from '@cycles/shared';
import { apiRequest } from './httpClient';
import type { MuscleDay } from '../utils/muscleSummary';

// Todos los ciclos de la atleta, de cualquier estado (para distinguir «aún no tiene ciclo» de «hoy descansa»).
export function fetchCycles() {
  return apiRequest<TrainingCycle[]>('/cycles');
}

// Historial por ejercicio (GET /me/exercise-progress, CYC-239): los tipos son los mismos que
// produce la API (@cycles/shared), así que un cambio de forma rompe la compilación.
export type { ExerciseProgress, ExerciseProgressResponse, ProgressSession } from '@cycles/shared';

// La API responde `{ exercises: [...] }` (no una lista suelta). Se acepta también la lista,
// y cualquier otra forma se trata como «sin ejercicios» para no tumbar la pantalla.
export async function fetchExerciseProgress(): Promise<ExerciseProgress[]> {
  const body = await apiRequest<Partial<ExerciseProgressResponse> | ExerciseProgress[]>('/me/exercise-progress');
  const list = Array.isArray(body) ? body : body?.exercises;
  return Array.isArray(list) ? list : [];
}

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
