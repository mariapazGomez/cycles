import { apiRequest } from "./httpClient";
import type { Answers, QuestionId } from "../lib/coachQuestions";

// Las respuestas del registro por pasos (CYC-295). No van a la analítica.
export interface CoachProfileView {
  pending: "register" | "survey" | null;
  answers: Answers;
  otherTexts: Partial<Record<QuestionId, string>>;
  // Cuántas preguntas seguidas desde la primera están respondidas.
  lastStep: number;
  completedAt: string | null;
}

export function getCoachProfile() {
  return apiRequest<CoachProfileView>("/users/me/coach-profile");
}

export function saveAnswer(question: QuestionId, values: string[], other?: string) {
  return apiRequest<CoachProfileView>("/users/me/coach-profile", { method: "PATCH", body: { question, values, ...(other ? { other } : {}) } });
}
