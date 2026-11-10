import type { Exercise, Routine, RoutineExercise, RoutineExerciseStructureInput, RoutineStructureInput, RoutineWorkBlock } from "@cycles/shared";
import { apiRequest } from "./httpClient";

export interface RoutineExerciseWithExercise extends RoutineExercise {
  exercise: Exercise;
}

export interface RoutineDetail extends Routine {
  routineExercises: RoutineExerciseWithExercise[];
  // Bloques de trabajo en orden (CYC-271); vacío en las rutinas anteriores.
  blocks?: RoutineWorkBlock[];
}

export type RoutineExerciseInput = RoutineExerciseStructureInput;

export function listRoutines() {
  return apiRequest<RoutineDetail[]>("/routines");
}

export function getRoutine(id: string) {
  return apiRequest<RoutineDetail>(`/routines/${id}`);
}

export function createRoutine(data: RoutineStructureInput & { name: string }) {
  return apiRequest<RoutineDetail>("/routines", { method: "POST", body: data });
}

export function updateRoutine(id: string, data: RoutineStructureInput) {
  return apiRequest<RoutineDetail>(`/routines/${id}`, { method: "PATCH", body: data });
}

export function deleteRoutine(id: string) {
  return apiRequest<void>(`/routines/${id}`, { method: "DELETE" });
}
