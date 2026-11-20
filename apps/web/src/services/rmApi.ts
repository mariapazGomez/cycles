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
