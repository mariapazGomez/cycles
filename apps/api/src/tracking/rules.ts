// Reglas de las alertas "Necesitan atención" (v1). Los umbrales y porcentajes
// son valores iniciales sin validar con coaches: quedan como constantes para
// ajustarlos fácil. Ver docs/prds/features/PRD-EjecucionYSeguimiento.md, §7.3.

export const HIGH_LOAD_RIR_MARGIN = 1; // RIR real ≤ objetivo − 1 → más duro de lo planificado
export const LOW_LOAD_RIR_MARGIN = 2; // RIR real ≥ objetivo + 2 → más fácil de lo planificado
export const CONSECUTIVE_SESSIONS = 2;
export const HIGH_LOAD_PERCENT = -5;
export const LOW_LOAD_PERCENT = 2.5;
export const PAIN_WINDOW_DAYS = 7;
export const SKIPPED_WINDOW_DAYS = 14;
export const SKIPPED_THRESHOLD = 2;

export interface SetLog {
  setNumber: number;
  actualReps: number;
  actualWeight: number | null;
  rir: number | null;
}

export interface ExerciseExecution {
  targetSets: number;
  targetReps: number;
  targetRir: number | null;
  logs: SetLog[];
}

// El RIR que reportó el atleta para el ejercicio: el de la última serie que lo tenga.
export function reportedRir(logs: SetLog[]): number | null {
  const withRir = logs.filter((l) => l.rir !== null).sort((a, b) => b.setNumber - a.setNumber);
  return withRir[0]?.rir ?? null;
}

export function missedReps(execution: ExerciseExecution): boolean {
  return (
    execution.logs.length < execution.targetSets ||
    execution.logs.some((l) => l.actualReps < execution.targetReps)
  );
}

export type EffortVerdict = "hard" | "easy" | "on_target" | "unknown";

// Compara una ejecución contra su objetivo. Sin RIR objetivo no hay veredicto.
export function effortVerdict(execution: ExerciseExecution): EffortVerdict {
  if (execution.targetRir === null || execution.logs.length === 0) {
    return "unknown";
  }
  const rir = reportedRir(execution.logs);
  if (missedReps(execution) || (rir !== null && rir <= execution.targetRir - HIGH_LOAD_RIR_MARGIN)) {
    return "hard";
  }
  if (rir === null) {
    return "unknown";
  }
  if (rir >= execution.targetRir + LOW_LOAD_RIR_MARGIN) {
    return "easy";
  }
  return "on_target";
}

// Desvío de esfuerzo: positivo = más duro de lo planificado.
export function rirDeviation(execution: ExerciseExecution): number | null {
  const rir = reportedRir(execution.logs);
  if (execution.targetRir === null || rir === null) {
    return null;
  }
  return execution.targetRir - rir;
}
