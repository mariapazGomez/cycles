import type { TodaySession } from "../types/cycle";

// Respuesta de ejemplo de GET /me/today con bloques (CYC-272), fijada por la prueba e2e de la
// API (hoy-bloques.e2e-spec.ts) y usable por la app. Es una sesión mixta a propósito: un
// bloque con un ejercicio y otro ejercicio suelto (blockId nulo), que es un estado normal.
// No se exporta desde el índice del paquete: solo lo importan las pruebas.
export const todaySessionFixture: TodaySession = {
  cycle: { id: "cyc-1", name: "Fuerza", currentWeek: 3 },
  session: {
    id: "ses-1",
    cycleId: "cyc-1",
    name: "Piernas",
    weekNumber: 3,
    slotNumber: 1,
    status: "pending",
    blocks: [
      { id: "blk-1", sessionId: "ses-1", name: "Calentamiento", type: "warmup", color: null, orderIndex: 1, note: null },
    ],
    sessionExercises: [
      {
        id: "se-1",
        sessionId: "ses-1",
        exerciseId: "ex-1",
        orderIndex: 1,
        targetSets: 2,
        targetReps: 12,
        blockId: "blk-1",
        exercise: { id: "ex-1", name: "Sentadilla", equipment: [], isActive: true },
        logs: [],
      },
      {
        id: "se-2",
        sessionId: "ses-1",
        exerciseId: "ex-1",
        orderIndex: 2,
        targetSets: 3,
        targetReps: 8,
        blockId: null,
        exercise: { id: "ex-1", name: "Sentadilla", equipment: [], isActive: true },
        logs: [],
      },
    ],
  },
  assignedToday: [],
};
