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
  // Carga como % del RM (CYC-312): «kg» (peso fijo, lo habitual) o «percent». Opcionales para no
  // tocar las filas que ya existen; sin modo es «kg».
  loadMode?: LoadMode;
  percentRm?: string;
  // Solo para mostrar: peso ya calculado con el RM (sesión de una persona o vista previa).
  resolvedKg?: number | null;
  restSeconds: string;
  // Reps en reserva objetivo ("" = sin objetivo). Ver PRD-EjecucionYSeguimiento.
  rir: string;
  // Nota para el atleta ("" = sin nota), hasta 500 caracteres.
  note: string;
  // Bloque de trabajo al que pertenece; null = suelto (CYC-271).
  blockId: string | null;
  // Solo en sesiones (CYC-275, PR 3): el ejercicio ya existente (conserva su id y sus series
  // registradas), cuántas series registró el atleta y un resumen de lo que hizo.
  sessionExerciseId?: string;
  loggedCount?: number;
  result?: string;
}

export type LoadMode = "kg" | "percent";

// % del RM válido: entero de 1 a 100.
export function isValidPercent(value: string | undefined): boolean {
  const n = parseNumber(value ?? "");
  return Number.isInteger(n) && n >= 1 && n <= 100;
}

export function rowLoadMode(row: Pick<Row, "loadMode">): LoadMode {
  return row.loadMode ?? "kg";
}

// Cambia el modo de carga: cada modo conserva lo que ya estaba escrito en el otro, pero solo el
// activo se guarda.
export function withLoadMode(mode: LoadMode): Pick<Row, "loadMode"> {
  return { loadMode: mode };
}

// Lo que se guarda de la carga: peso fijo o %, nunca ambos.
export function loadPayload(row: Row): { weight?: number; percent?: number } {
  if (rowLoadMode(row) === "percent") return isValidPercent(row.percentRm) ? { percent: parseNumber(row.percentRm ?? "") } : {};
  const weight = parseNumber(row.weight);
  return Number.isFinite(weight) && weight > 0 ? { weight } : {};
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
    ...(re.defaultPercentRm != null ? { loadMode: "percent" as const, percentRm: String(re.defaultPercentRm) } : {}),
    restSeconds: re.defaultRestSeconds ? String(re.defaultRestSeconds) : "",
    rir: re.defaultRir === null || re.defaultRir === undefined ? "" : String(re.defaultRir),
    note: re.note ?? "",
    blockId: re.blockId ?? null,
  };
}

export function toInput(row: Row): RoutineExerciseInput {
  const load = loadPayload(row);
  const rest = parseNumber(row.restSeconds);
  return {
    exerciseId: row.exerciseId,
    defaultSets: parseNumber(row.sets),
    defaultReps: parseNumber(row.reps),
    defaultWeight: load.weight,
    defaultPercentRm: load.percent,
    defaultRestSeconds: Number.isFinite(rest) && rest >= 0 ? Math.round(rest) : undefined,
    defaultRir: row.rir !== "" ? Number(row.rir) : undefined,
    note: row.note.trim() !== "" ? row.note.trim() : undefined,
  };
}

export function toStatsRow(row: Row) {
  return { ...row, group: muscleGroupLabel(row.muscleGroup) };
}
