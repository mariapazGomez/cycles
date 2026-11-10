import type { RoutineStructureInput, SessionStructureInput, SessionWorkBlock } from "../types/work-block";

// Bloque de ejemplo de GET /sessions/:id, fijado por la prueba e2e de la API
// (bloques.e2e-spec.ts) y usable por la web y la app. Si cambia la forma, falla.
// No se exporta desde el índice del paquete: solo lo importan las pruebas.
export const sessionWorkBlockFixture: SessionWorkBlock = {
  id: "blk-1",
  sessionId: "ses-1",
  name: "Calentamiento",
  type: "warmup",
  color: null,
  orderIndex: 1,
  note: "Sin prisa",
};

// Cuerpos de ejemplo de las llamadas que guardan la estructura. La prueba e2e de la API los
// envía tal cual (si la API deja de aceptarlos, falla) y la web arma los suyos con la misma
// forma. `exerciseId` es el de un ejercicio disponible: la prueba lo reemplaza.
export const routineStructureFixture: RoutineStructureInput = {
  name: "Piernas por bloques",
  blocks: [
    { type: "warmup", name: "Calentamiento", note: "Sin prisa", exercises: [{ exerciseId: "ex-1", defaultSets: 2, defaultReps: 12 }] },
    { type: "custom", name: "Core", color: "#8a63d2", exercises: [{ exerciseId: "ex-1", defaultSets: 3, defaultReps: 30 }] },
    { type: "strength", name: "Fuerza", exercises: [{ exerciseId: "ex-1", defaultSets: 4, defaultReps: 6, defaultWeight: 70, defaultRestSeconds: 90, defaultRir: 2, note: "Baja lento" }] },
  ],
  exercises: [{ exerciseId: "ex-1", defaultSets: 1, defaultReps: 10 }],
};

export const sessionStructureFixture: SessionStructureInput = {
  blocks: [
    { type: "warmup", name: "Calentamiento", exercises: [{ exerciseId: "ex-1", targetSets: 2, targetReps: 12 }] },
    { type: "strength", name: "Fuerza", exercises: [{ exerciseId: "ex-1", targetSets: 4, targetReps: 6, targetWeight: 70 }] },
  ],
  exercises: [{ exerciseId: "ex-1", targetSets: 1, targetReps: 10 }],
};
