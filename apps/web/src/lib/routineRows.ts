// Filas de ejercicios de una rutina tal como las escribe el coach (todo texto).
// Las comparten el editor de rutinas y el creador rápido de la pizarra.
import type { MuscleGroup } from "@cycles/shared";
import type { RoutineExerciseInput, RoutineExerciseWithExercise } from "../services/routinesApi";
import { parseNumber } from "./routineStats";
import { muscleGroupLabel } from "./muscleGroups";

// Lo que la fila muestra de un ejercicio, más lo que el coach tiene escrito.
export interface Row {
  key: string;
  exerciseId: string;
  name: string;
  muscleGroup: MuscleGroup | undefined;
  sets: string;
  reps: string;
  weight: string;
  restSeconds: string;
  // Reps en reserva objetivo ("" = sin objetivo). Ver PRD-EjecucionYSeguimiento.
  rir: string;
}

export const DEFAULT_SETS = "3";

export function toText(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value).replace(".", ",");
}

export function rowFromRoutine(key: string, re: RoutineExerciseWithExercise): Row {
  return {
    key,
    exerciseId: re.exerciseId,
    name: re.exercise.name,
    muscleGroup: re.exercise.muscleGroup,
    sets: String(re.defaultSets),
    reps: String(re.defaultReps),
    weight: re.defaultWeight ? toText(re.defaultWeight) : "",
    restSeconds: re.defaultRestSeconds ? String(re.defaultRestSeconds) : "",
    rir: re.defaultRir === null || re.defaultRir === undefined ? "" : String(re.defaultRir),
  };
}

export function toInput(row: Row): RoutineExerciseInput {
  const weight = parseNumber(row.weight);
  const rest = parseNumber(row.restSeconds);
  return {
    exerciseId: row.exerciseId,
    defaultSets: parseNumber(row.sets),
    defaultReps: parseNumber(row.reps),
    defaultWeight: Number.isFinite(weight) && weight > 0 ? weight : undefined,
    defaultRestSeconds: Number.isFinite(rest) && rest >= 0 ? Math.round(rest) : undefined,
    defaultRir: row.rir !== "" ? Number(row.rir) : undefined,
  };
}

// «Con detalles»: tiene peso, descanso o reps en reserva más allá de series y reps.
export function hasDetails(row: Pick<Row, "weight" | "restSeconds" | "rir">): boolean {
  return row.weight.trim() !== "" || row.restSeconds.trim() !== "" || row.rir !== "";
}

export function toStatsRow(row: Row) {
  return { ...row, group: muscleGroupLabel(row.muscleGroup) };
}
