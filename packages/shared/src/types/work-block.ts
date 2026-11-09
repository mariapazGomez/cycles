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
