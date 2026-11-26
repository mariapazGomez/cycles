import type { SessionWorkBlock } from "./work-block";

export type CycleStatus = "active" | "completed" | "archived";
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

// Lo que un ejercicio necesita para hacerse. Lista cerrada y de selección
// múltiple; «bodyweight» (peso corporal) no se combina con los demás.
export const EQUIPMENT = [
  "barbell",
  "plates",
  "dumbbells",
  "kettlebell",
  "bench",
  "rack",
  "cable",
  "machine",
  "band",
  "pullup_bar",
  "dip_bars",
  "suspension",
  "medicine_ball",
  "box",
  "bodyweight",
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

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
  // Solo en las plantillas (isTemplate = true), que además no tienen atleta:
  // athleteId llega vacío y las fechas son de referencia. Ver docs/diseno/biblioteca.
  templateWeeks?: number | null;
  cycleType: CycleType;
  // null cuando cycleType = 'macrocycle' (un macrociclo es un contenedor,
  // no tiene grid propio).
  sessionsPerWeek?: number;
  // Si este plan vive dentro de un macrociclo contenedor.
  parentCycleId?: string;
  // Copia de un ciclo del equipo (CYC-314); nulo en los ciclos propios y en quien salió del equipo.
  teamCycleId?: string | null;
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
  // Copia de una sesión del equipo (CYC-314). Con detachedAt quedó ajustada: ya no recibe cambios.
  teamSessionId?: string | null;
  detachedAt?: string | null;
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
  // % del RM (1–100); excluyente con defaultWeight (CYC-306).
  defaultPercentRm?: number | null;
  defaultRestSeconds?: number;
  // Repeticiones en reserva objetivo (0–4). Sin valor = sin objetivo de esfuerzo.
  defaultRir?: number | null;
  // Nota del coach para el atleta (hasta 500 caracteres); null/undefined = sin nota.
  note?: string | null;
  // Bloque de trabajo al que pertenece (CYC-271); nulo = ejercicio suelto.
  blockId?: string | null;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup?: MuscleGroup;
  // Grupos que trabaja además del principal; vacío si solo tiene uno.
  secondaryMuscleGroups?: MuscleGroup[];
  description?: string;
  videoUrl?: string;
  // Vacío en los ejercicios del catálogo que aún no se revisan.
  equipment: Equipment[];
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
  // Carga como % del RM del atleta (1–100); excluyente con targetWeight (CYC-306).
  targetPercentRm?: number | null;
  // Solo con % del RM: ok (resolvedWeightKg ya redondeado), missing (el atleta no tiene RM) o
  // needs_athlete (rutina o plantilla sin atleta). Nulo si el ejercicio no lleva %.
  rmStatus?: "ok" | "missing" | "needs_athlete" | null;
  resolvedWeightKg?: number | null;
  targetRestSeconds?: number;
  targetRir?: number | null;
  // Nota del coach para el atleta, copiada de la rutina y editable por sesión.
  note?: string | null;
  // Bloque de trabajo al que pertenece (CYC-271); nulo = ejercicio suelto.
  blockId?: string | null;
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
  // 1 = cierre vigente; 0 = anulado al reabrir la sesión (no se borra).
  active: 0 | 1;
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
    // Bloques de la sesión, por orderIndex (CYC-272). Vacío si no tiene. Un ejercicio con
    // blockId nulo no pertenece a ningún bloque, y eso es normal aun si hay bloques: la
    // app lo dibuja aparte (al final), sin esconderlo. Opcional por compatibilidad con
    // respuestas anteriores.
    blocks?: SessionWorkBlock[];
  };
  // Sesiones pendientes que el atleta asignó para hoy (solo viene si se
  // pidió con ?date=). Puede incluir la propia `session`.
  assignedToday?: Array<{
    id: string;
    name: string;
    cycleId: string;
    weekNumber: number;
    slotNumber: number;
  }>;
}

// Lo que devuelve GET /me/today/cycles (CYC-314): una entrada por ciclo con lo que queda por
// hacer (las en curso y las del día; si no hay, la siguiente pendiente) y lo ya hecho hoy.
export interface TodayCycleEntry {
  cycle: TodaySession["cycle"];
  pending: TodaySession["session"][];
  // La de `pending` tiene un día que aún no llega: se muestra como «Próxima».
  upcoming: boolean;
  done: Array<{
    id: string;
    name: string;
    weekNumber: number;
    slotNumber: number;
    exercises: { done: number; total: number };
  }>;
}
