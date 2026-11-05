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

// Todos los ciclos de la atleta, de cualquier estado (para distinguir «aún no tiene ciclo» de «hoy descansa»).
export function fetchCycles() {
  return apiRequest<TrainingCycle[]>('/cycles');
}

// Historial por ejercicio (GET /me/exercise-progress, CYC-239): solo ejercicios hechos
// en dos sesiones o más, las más recientes al final.
export interface ProgressSession {
  sessionId: string;
  weekNumber: number;
  date: string;
  plannedSets: number;
  plannedReps: number;
  plannedWeight: number | null;
  plannedRir: number | null;
  actualWeight: number | null;
  actualReps: number;
  series: Array<{ setNumber: number; weight: number | null; reps: number; rir: number | null }>;
}

export interface ExerciseProgress {
  exerciseId: string;
  name: string;
  muscleGroup: string | null;
  sessions: ProgressSession[];
}

// La API responde `{ exercises: [...] }` (no una lista suelta). Se acepta también la lista,
// y cualquier otra forma se trata como «sin ejercicios» para no tumbar la pantalla.
export async function fetchExerciseProgress(): Promise<ExerciseProgress[]> {
  const body = await apiRequest<{ exercises?: ExerciseProgress[] } | ExerciseProgress[]>('/me/exercise-progress');
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
