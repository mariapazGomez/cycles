import type { Equipment, Exercise, MuscleGroup } from "@cycles/shared";
import { apiRequest } from "./httpClient";

export interface ExerciseInput {
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment[];
  description?: string | null;
  videoUrl?: string | null;
}

export function listExercises() {
  return apiRequest<Exercise[]>("/exercises");
}

export function createExercise(input: ExerciseInput) {
  return apiRequest<Exercise>("/exercises", { method: "POST", body: input });
}

export function updateExercise(id: string, input: Partial<ExerciseInput>) {
  return apiRequest<Exercise>(`/exercises/${id}`, { method: "PATCH", body: input });
}

export function deactivateExercise(id: string) {
  return apiRequest<Exercise>(`/exercises/${id}/deactivate`, { method: "PATCH" });
}
