export type CycleStatus = "draft" | "active" | "completed" | "archived";
export type SessionStatus = "pending" | "completed" | "skipped";
export type CycleType = "microcycle" | "mesocycle" | "macrocycle";
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
  cycleType: CycleType;
  // null cuando cycleType = 'macrocycle' (un macrociclo es un contenedor,
  // no tiene grid propio).
  sessionsPerWeek?: number;
  // Si este plan vive dentro de un macrociclo contenedor.
  parentCycleId?: string;
}

export interface TrainingSession {
  id: string;
  cycleId: string;
  name: string;
  weekNumber: number;
  slotNumber: number;
  scheduledDate?: string;
  status: SessionStatus;
  // De qué rutina de la biblioteca salió — trazabilidad interna, no se
  // muestra en la UI.
  routineId?: string;
  startedAt?: string | null;
}

export interface Routine {
  id: string;
  coachId: string;
  name: string;
  createdAt: string;
}

export interface RoutineExercise {
  id: string;
  routineId: string;
  exerciseId: string;
  orderIndex: number;
  defaultSets: number;
  defaultReps: number;
  defaultWeight?: number;
  defaultRestSeconds?: number;
  // Repeticiones en reserva objetivo (0–4). Sin valor = sin objetivo de esfuerzo.
  defaultRir?: number | null;
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
  targetRir?: number | null;
}

// Un registro por serie. Append-only: una corrección es un registro nuevo
// con supersedesId. Ver docs/prds/features/PRD-EjecucionYSeguimiento.md.
export interface ExerciseLog {
  id: string;
  sessionExerciseId: string;
  athleteId: string;
  setNumber: number;
  actualReps: number;
  // En kg; null = peso corporal.
  actualWeight: number | null;
  // Repeticiones en reserva (0–4, 4 = "4 o más").
  rir: number | null;
  supersedesId: string | null;
  loggedAt: string;
}

export type SessionOutcome = "completed" | "skipped";

export interface SessionFeedback {
  id: string;
  sessionId: string;
  athleteId: string;
  outcome: SessionOutcome;
  srpe: number | null;
  durationMinutes: number | null;
  pain: boolean;
  painNotes: string | null;
  notes: string | null;
  supersedesId: string | null;
  submittedAt: string;
}
