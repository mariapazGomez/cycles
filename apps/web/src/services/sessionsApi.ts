import type { Exercise, SessionExercise, SessionStatus, TrainingCycle, TrainingSession } from "@cycles/shared";
import { apiRequest } from "./httpClient";

export interface SessionExerciseWithExercise extends SessionExercise {
  exercise: Exercise;
}

export interface SessionDetail extends TrainingSession {
  cycle: TrainingCycle;
  sessionExercises: SessionExerciseWithExercise[];
}

export function listSessions(cycleId: string) {
  return apiRequest<TrainingSession[]>(`/cycles/${cycleId}/sessions`);
}

export function createSession(cycleId: string, data: { name: string; scheduledDate?: string }) {
  return apiRequest<TrainingSession>(`/cycles/${cycleId}/sessions`, {
    method: "POST",
    body: data,
  });
}

export function getSession(id: string) {
  return apiRequest<SessionDetail>(`/sessions/${id}`);
}

export function updateSession(
  id: string,
  data: Partial<{ name: string; scheduledDate: string; status: SessionStatus }>,
) {
  return apiRequest<TrainingSession>(`/sessions/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteSession(id: string) {
  return apiRequest<void>(`/sessions/${id}`, { method: "DELETE" });
}

export function addExercise(
  sessionId: string,
  data: {
    exerciseId: string;
    targetSets: number;
    targetReps: number;
    targetWeight?: number;
    targetRestSeconds?: number;
  },
) {
  return apiRequest<SessionExerciseWithExercise>(`/sessions/${sessionId}/exercises`, {
    method: "POST",
    body: data,
  });
}

export function updateExercise(
  id: string,
  data: Partial<{ targetSets: number; targetReps: number; targetWeight: number; targetRestSeconds: number }>,
) {
  return apiRequest<SessionExerciseWithExercise>(`/session-exercises/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export function removeExercise(id: string) {
  return apiRequest<void>(`/session-exercises/${id}`, { method: "DELETE" });
}
