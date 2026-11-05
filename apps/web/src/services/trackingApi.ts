import type { AthleteSummary, CycleProgress } from "@cycles/shared";
import { apiRequest } from "./httpClient";

// Seguimiento del coach — ver docs/prds/features/PRD-EjecucionYSeguimiento.md.

export type AttentionKind = "pain" | "high_load" | "low_adherence" | "low_load";

export interface LoadSuggestion {
  exerciseId: string;
  fromWeek: number;
  percentChange: number;
  reason: string;
}

export interface AttentionItem {
  kind: AttentionKind;
  athlete: { id: string; name: string };
  cycle: { id: string; name: string };
  exercise: { id: string; name: string } | null;
  sessionId: string | null;
  message: string;
  suggestion: LoadSuggestion | null;
}

export function getAttention() {
  return apiRequest<AttentionItem[]>("/coach/attention");
}

export type { AthleteSummary, CycleProgress, EffortVerdict } from "@cycles/shared";

export function getAthleteSummary(athleteId: string, weeks = 6) {
  return apiRequest<AthleteSummary>(`/athletes/${athleteId}/summary?weeks=${weeks}`);
}

export function getCycleProgress(cycleId: string) {
  return apiRequest<CycleProgress>(`/cycles/${cycleId}/progress`);
}

export function applyLoadAdjustment(cycleId: string, suggestion: LoadSuggestion) {
  return apiRequest<{ id: string; affectedCount: number }>(`/cycles/${cycleId}/load-adjustments`, {
    method: "POST",
    body: suggestion,
  });
}
