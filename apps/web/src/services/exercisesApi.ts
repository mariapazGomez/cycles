import type { Exercise } from "@cycles/shared";
import { apiRequest } from "./httpClient";

export function listExercises() {
  return apiRequest<Exercise[]>("/exercises");
}
