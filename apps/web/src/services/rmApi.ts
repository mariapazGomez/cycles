import { apiRequest } from "./httpClient";

// RM del atleta por ejercicio (CYC-306/311). Solo el coach lo registra.
export type MaxSource = "coach" | "athlete" | "estimated";

export interface RmExerciseInfo {
  exerciseId: string;
  name: string;
  muscleGroup: string | null;
  // Mayor peso levantado en series vigentes: referencia, nunca el RM.
  maxLifted: { weightKg: number; reps: number; loggedAt: string } | null;
}

export interface RmListEntry extends RmExerciseInfo {
  weightKg: number;
  measuredAt: string;
  source: MaxSource;
}

export interface RmList {
  withMax: RmListEntry[];
  // Ejercicios del plan del atleta que aún no tienen RM.
  withoutMax: RmExerciseInfo[];
}

export function listAthleteRm(athleteId: string) {
  return apiRequest<RmList>(`/athletes/${athleteId}/rm`);
}

export interface RmHistoryEntry {
  id: string;
  weightKg: number;
  measuredAt: string;
  createdAt: string;
  source: MaxSource;
  // Solo con «estimated»: con qué datos se calculó (Epley).
  estimatedFromWeightKg: number | null;
  estimatedFromReps: number | null;
}

export interface RmDetail {
  exercise: { id: string; name: string };
  current: RmHistoryEntry | null;
  history: RmHistoryEntry[];
  maxLiftedKg: number | null;
}

export interface RecordRmInput {
  weightKg: number;
  // «AAAA-MM-DD»; sin fecha, hoy.
  measuredAt?: string;
  source?: "coach" | "estimated";
  estimatedFromWeightKg?: number;
  estimatedFromReps?: number;
}

export function getAthleteRm(athleteId: string, exerciseId: string) {
  return apiRequest<RmDetail>(`/athletes/${athleteId}/rm/${exerciseId}`);
}

export function recordRm(athleteId: string, exerciseId: string, input: RecordRmInput) {
  return apiRequest<RmHistoryEntry>(`/athletes/${athleteId}/rm/${exerciseId}`, { method: "POST", body: input });
}
