export type CycleStatus = "draft" | "active" | "completed" | "archived";
export type SessionStatus = "pending" | "completed" | "skipped";
export type MuscleGroup =
  | "chest"
  | "back"
  | "legs"
  | "glutes"
  | "shoulders"
  | "arms"
  | "core"
  | "cardio"
  | "other";

export interface TrainingCycle {
  id: string;
  coachId: string;
  athleteId: string;
  name: string;
  objective?: string;
  startDate: string;
  endDate: string;
  status: CycleStatus;
  isTemplate: boolean;
  templateId?: string;
}

export interface TrainingSession {
  id: string;
  cycleId: string;
  name: string;
  orderIndex: number;
  scheduledDate?: string;
  status: SessionStatus;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup?: MuscleGroup;
  description?: string;
  videoUrl?: string;
  // null/undefined = catálogo global; id = ejercicio propio de ese coach.
  createdBy?: string;
  isActive: boolean;
}

export interface SessionExercise {
  id: string;
  sessionId: string;
  exerciseId: string;
  orderIndex: number;
  targetSets: number;
  targetReps: number;
  targetWeight?: number;
  targetRestSeconds?: number;
}

export interface ExerciseLog {
  id: string;
  sessionExerciseId: string;
  athleteId: string;
  actualSets?: number;
  actualReps?: number;
  actualWeight?: number;
  rpe?: number;
  notes?: string;
  loggedAt: string;
}
