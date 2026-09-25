export type CycleStatus = "draft" | "active" | "completed" | "archived";
export type SessionStatus = "pending" | "completed" | "skipped";
export type CycleType = "microcycle" | "mesocycle" | "macrocycle";
export type SessionOutcome = "completed" | "skipped";
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
  // Lo marca el atleta al empezar; base para pre-calcular la duración.
  startedAt?: string;
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
  setNumber: number;
  actualReps: number;
  // En kg; sin valor = peso corporal.
  actualWeight?: number;
  // Repeticiones en reserva: 0-4 (4 = "4 o más").
  rir?: number;
  // Presente cuando este registro corrige uno anterior.
  supersedesId?: string;
  loggedAt: string;
}

// Cierre de una sesión por parte del atleta. Append-only: una corrección
// nueva llega con supersedesId apuntando al feedback vigente.
export interface SessionFeedback {
  id: string;
  sessionId: string;
  athleteId: string;
  outcome: SessionOutcome;
  // Esfuerzo de la sesión (sRPE, escala CR-10 de Foster). Solo si outcome = completed.
  srpe?: number;
  durationMinutes?: number;
  pain: boolean;
  painNotes?: string;
  notes?: string;
  supersedesId?: string;
  submittedAt: string;
}

// Lo que devuelve GET /me/today: la próxima sesión pendiente del atleta,
// con sus ejercicios y los logs ya registrados en cada uno.
export interface TodaySession {
  cycle: { id: string; name: string; currentWeek: number };
  session: TrainingSession & {
    sessionExercises: (SessionExercise & {
      exercise: Exercise;
      logs: ExerciseLog[];
    })[];
  };
}
