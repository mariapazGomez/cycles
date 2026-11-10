// Bloques de trabajo de una rutina o sesión (CYC-271, docs/diseno/sesion-por-bloques).
// Tipos únicos para la API (que los produce) y la web y la app (que los consumen).
// La API solo importa TIPOS de este paquete, nunca valores (build-layout.spec.ts).

// «superset» está reservado hasta definir sus reglas (CYC-108): ninguna pantalla lo ofrece.
export type WorkBlockType =
  | "warmup"
  | "plyometrics"
  | "strength"
  | "mobility"
  | "cooldown"
  | "cardio"
  | "custom"
  | "superset";

export interface WorkBlock {
  id: string;
  name: string;
  type: WorkBlockType;
  // Solo en «custom»: una muestra de la lista cerrada del diseño. Nulo en los demás.
  color: string | null;
  orderIndex: number;
  note: string | null;
}

// Un bloque de una rutina (GET /routines) lleva además su rutina.
export interface RoutineWorkBlock extends WorkBlock {
  routineId: string;
}

// Un bloque de una sesión (GET /sessions/:id).
export interface SessionWorkBlock extends WorkBlock {
  sessionId: string;
}

// Lo que el cliente envía para guardar la estructura completa (CYC-275). Los bloques y
// ejercicios que traen `id` ya existen y conservan el suyo; los demás son nuevos. Lo que
// no se envía se quita.
export interface RoutineExerciseStructureInput {
  id?: string;
  exerciseId: string;
  defaultSets: number;
  defaultReps: number;
  defaultWeight?: number;
  defaultRestSeconds?: number;
  defaultRir?: number;
  note?: string;
}

export interface SessionExerciseStructureInput {
  id?: string;
  exerciseId: string;
  targetSets: number;
  targetReps: number;
  targetWeight?: number;
  targetRestSeconds?: number;
  targetRir?: number;
  note?: string;
}

export interface WorkBlockInput<E> {
  id?: string;
  type: WorkBlockType;
  name: string;
  color?: string;
  note?: string;
  exercises: E[];
}

// POST /routines y PATCH /routines/:id
export interface RoutineStructureInput {
  name?: string;
  blocks?: WorkBlockInput<RoutineExerciseStructureInput>[];
  // Ejercicios sueltos, sin bloque (van al final).
  exercises?: RoutineExerciseStructureInput[];
}

// PUT /sessions/:id/structure
export interface SessionStructureInput {
  blocks?: WorkBlockInput<SessionExerciseStructureInput>[];
  exercises?: SessionExerciseStructureInput[];
}

// Las 10 muestras del bloque personalizado (sin azul), en el orden del diseño.
export const CUSTOM_BLOCK_COLORS = ["#e8a317", "#e0752b", "#d1494d", "#d9588f", "#8a63d2", "#1fa39a", "#2f9e5f", "#a0663a", "#4a5568", "#1f2228"] as const;

export const WORK_BLOCK_TYPES = ["warmup", "plyometrics", "strength", "mobility", "cooldown", "cardio", "custom", "superset"] as const;
