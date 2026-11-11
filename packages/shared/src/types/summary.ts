import type { SessionFeedback, SessionStatus } from "./cycle";

// Contrato API ↔ web del seguimiento del coach y de la pizarra del Resumen
// (CYC-240). La API tipa lo que devuelve con estos tipos (si cambia la forma, no
// compila) y la web los consume tal cual; `fixtures/resumen.ts` tiene un ejemplo
// y una prueba e2e comprueba que la respuesta real tiene su misma forma.

// GET /athletes/:id/summary
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

export type EffortVerdict = "hard" | "easy" | "on_target" | "unknown";

// GET /cycles/:id/progress
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

// GET y PUT /coach/summary-layout
export type ChartSize = "mitad" | "completo";

export interface ChartFilters {
  ejercicioId?: string;
  periodoSemanas?: number;
  estadoSesion?: "hecha" | "omitida" | "pendiente";
}

export interface ChartDefinition {
  id: string;
  origen: "sistema" | "coach";
  tamano: ChartSize;
  visible: boolean;
  // Solo en los gráficos del coach (fase 2).
  titulo?: string;
  medida?: string;
  agrupar?: string;
  forma?: string;
  filtros?: ChartFilters;
}

export interface SummaryLayout {
  charts: ChartDefinition[];
  isDefault: boolean;
}

// GET /me/weekly-summary?weekStart=AAAA-MM-DD (CYC-261): el resumen de la semana del propio
// atleta para el anillo de Hoy. La semana va de lunes a domingo. Una sesión cuenta en la semana
// en que estaba planeada (la misma regla que el resumen del coach), con su tiempo y su esfuerzo.
// `minutesTrained` y `averageSrpe` son null si ninguna sesión hecha de esa semana los registró.
export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  sessionsPlanned: number;
  sessionsDone: number;
  minutesTrained: number | null;
  averageSrpe: number | null;
}
