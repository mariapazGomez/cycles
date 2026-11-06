import type { AthleteSummary, CycleProgress, SummaryLayout } from "../types/summary";

// Ejemplos de lo que devuelven GET /athletes/:id/summary, GET /cycles/:id/progress
// y GET /coach/summary-layout (CYC-240). Tipados con los tipos de la API: si la
// forma cambia, esto no compila. La prueba e2e `contrato-resumen` comprueba que la
// respuesta REAL de la API tiene la misma forma, y las pruebas de la web los usan
// en vez de inventar datos.

export const athleteSummaryFixture: AthleteSummary = {
  athlete: { id: "athlete-1", name: "Valentina Soto" },
  weeks: [
    { weekStart: "2026-10-19", assigned: 3, completed: 3, skipped: 0, load: 5400 },
    { weekStart: "2026-10-26", assigned: 3, completed: 2, skipped: 1, load: 4100 },
  ],
  exercises: [
    {
      exerciseId: "ex-sq",
      name: "Sentadilla con barra",
      e1rm: [{ weekStart: "2026-10-19", value: 102.5 }],
      avgRirDeviation: 0.5,
      lastTargetRir: 2,
      lastRir: 1,
    },
  ],
};

export const cycleProgressFixture: CycleProgress = {
  cycle: { id: "cycle-1", name: "Fuerza base", currentWeek: 4 },
  sessions: [
    {
      id: "s-1",
      name: "Piernas",
      weekNumber: 1,
      slotNumber: 1,
      status: "completed",
      feedback: {
        outcome: "completed",
        srpe: 7,
        durationMinutes: 62,
        pain: false,
        painNotes: null,
        notes: null,
        submittedAt: "2026-10-05T19:30:00.000Z",
      },
      exercises: [
        {
          sessionExerciseId: "se-1",
          exercise: { id: "ex-sq", name: "Sentadilla con barra" },
          target: { sets: 3, reps: 8, weight: 80, rir: 2 },
          actual: {
            sets: [
              { setNumber: 1, reps: 8, weight: 80, rir: null },
              { setNumber: 2, reps: 7, weight: 80, rir: 1 },
            ],
            reportedRir: 1,
            verdict: "hard",
          },
        },
      ],
    },
    {
      id: "s-2",
      name: "Empuje",
      weekNumber: 1,
      slotNumber: 2,
      status: "pending",
      feedback: null,
      exercises: [],
    },
  ],
};

export const summaryLayoutFixture: SummaryLayout = {
  isDefault: false,
  charts: [
    { id: "plan-real", origen: "sistema", tamano: "completo", visible: true },
    { id: "progreso-ciclo", origen: "sistema", tamano: "mitad", visible: true },
    { id: "constancia", origen: "sistema", tamano: "mitad", visible: false },
    { id: "esfuerzo", origen: "sistema", tamano: "mitad", visible: true },
    { id: "costo-ejercicio", origen: "sistema", tamano: "mitad", visible: true },
  ],
};

// ¿La respuesta tiene la misma forma que el ejemplo? Mismas claves en cada objeto,
// cada elemento de una lista con la forma del primero del ejemplo, y el mismo tipo en
// cada valor (un `null` vale en cualquier lugar). Devuelve las diferencias.
export function shapeDiff(actual: unknown, example: unknown, path = "$"): string[] {
  if (actual === null || example === null || actual === undefined) return [];
  if (Array.isArray(example)) {
    if (!Array.isArray(actual)) return [`${path}: se esperaba una lista`];
    if (example.length === 0) return [];
    return actual.flatMap((item, i) => shapeDiff(item, example[0], `${path}[${i}]`));
  }
  if (typeof example === "object") {
    if (typeof actual !== "object" || Array.isArray(actual)) return [`${path}: se esperaba un objeto`];
    const a = actual as Record<string, unknown>;
    const e = example as Record<string, unknown>;
    const missing = Object.keys(e).filter((k) => !(k in a)).map((k) => `${path}.${k}: falta`);
    const extra = Object.keys(a).filter((k) => !(k in e)).map((k) => `${path}.${k}: sobra`);
    return [...missing, ...extra, ...Object.keys(e).filter((k) => k in a).flatMap((k) => shapeDiff(a[k], e[k], `${path}.${k}`))];
  }
  return typeof actual === typeof example ? [] : [`${path}: se esperaba ${typeof example} y llegó ${typeof actual}`];
}
