import type { Exercise, Routine, RoutineExercise } from "@cycles/shared";
import { apiRequest } from "./httpClient";

export interface RoutineExerciseWithExercise extends RoutineExercise {
  exercise: Exercise;
}

export interface RoutineDetail extends Routine {
  routineExercises: RoutineExerciseWithExercise[];
}

export interface RoutineExerciseInput {
  exerciseId: string;
  defaultSets: number;
  defaultReps: number;
  defaultWeight?: number;
  defaultRestSeconds?: number;
  defaultRir?: number;
}

export function listRoutines() {
  return apiRequest<RoutineDetail[]>("/routines");
}

export function getRoutine(id: string) {
  return apiRequest<RoutineDetail>(`/routines/${id}`);
}

export function createRoutine(data: { name: string; exercises: RoutineExerciseInput[] }) {
  return apiRequest<RoutineDetail>("/routines", { method: "POST", body: data });
}

export function updateRoutine(
  id: string,
  data: Partial<{ name: string; exercises: RoutineExerciseInput[] }>,
) {
  return apiRequest<RoutineDetail>(`/routines/${id}`, { method: "PATCH", body: data });
}

export function deleteRoutine(id: string) {
  return apiRequest<void>(`/routines/${id}`, { method: "DELETE" });
}
