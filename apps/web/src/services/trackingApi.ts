import type { SessionFeedback, SessionStatus } from "@cycles/shared";
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

export interface AthleteSummary {
  athlete: { id: string; name: string };
  weeks: { weekStart: string; assigned: number; completed: number; skipped: number; load: number }[];
  exercises: {
    exerciseId: string;
    name: string;
    e1rm: { weekStart: string; value: number }[];
    avgRirDeviation: number | null;
    lastTargetRir: number | null;
    lastRir: number | null;
  }[];
}

export function getAthleteSummary(athleteId: string, weeks = 6) {
  return apiRequest<AthleteSummary>(`/athletes/${athleteId}/summary?weeks=${weeks}`);
}

export type EffortVerdict = "hard" | "easy" | "on_target" | "unknown";

export interface CycleProgress {
  cycle: { id: string; name: string; currentWeek: number };
  sessions: {
    id: string;
    name: string;
    weekNumber: number;
    slotNumber: number;
    status: SessionStatus;
    feedback: Pick<
      SessionFeedback,
      "outcome" | "srpe" | "durationMinutes" | "pain" | "painNotes" | "notes" | "submittedAt"
    > | null;
    exercises: {
      sessionExerciseId: string;
      exercise: { id: string; name: string };
      target: { sets: number; reps: number; weight: number | null; rir: number | null };
      actual: {
        sets: { setNumber: number; reps: number; weight: number | null; rir: number | null }[];
        reportedRir: number | null;
        verdict: EffortVerdict;
      };
    }[];
  }[];
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
