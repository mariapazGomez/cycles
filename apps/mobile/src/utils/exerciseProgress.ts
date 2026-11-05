import type { ExerciseProgress } from '../services/planApi';

// Resumen de un ejercicio repetido para la tarjeta del Resumen (CYC-241): de dónde
// partió, dónde está, cuánto cambió y la serie de valores para la línea pequeña.
export interface ExerciseSummary {
  id: string;
  name: string;
  /** false = todas las sesiones fueron con peso corporal. */
  hasWeight: boolean;
  weights: number[];
  reps: number[];
  firstWeight: number | null;
  lastWeight: number | null;
  weightDelta: number;
  firstReps: number;
  lastReps: number;
  repsDelta: number;
  /** Cuánto cambió en total (para ordenar: primero los que más cambiaron). */
  change: number;
  source: ExerciseProgress;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function summarizeExercise(exercise: ExerciseProgress): ExerciseSummary {
  const sessions = exercise.sessions;
  const weights = sessions
    .map(s => s.actualWeight)
    .filter((w): w is number => w !== null);
  const reps = sessions.map(s => s.actualReps);
  const firstWeight = weights.length > 0 ? weights[0] : null;
  const lastWeight = weights.length > 0 ? weights[weights.length - 1] : null;
  const weightDelta =
    firstWeight !== null && lastWeight !== null
      ? round1(lastWeight - firstWeight)
      : 0;
  const repsDelta = round1(reps[reps.length - 1] - reps[0]);
  // El peso pesa más que las repeticiones: un cambio relativo de peso y de repeticiones.
  const relWeight = firstWeight ? Math.abs(weightDelta) / firstWeight : 0;
  const relReps = reps[0] ? Math.abs(repsDelta) / reps[0] : 0;
  return {
    id: exercise.exerciseId,
    name: exercise.name,
    hasWeight: weights.length > 0,
    weights,
    reps,
    firstWeight,
    lastWeight,
    weightDelta,
    firstReps: reps[0],
    lastReps: reps[reps.length - 1],
    repsDelta,
    change: relWeight + relReps,
    source: exercise,
  };
}

// Los que más cambiaron primero; a igualdad, se conserva el orden de la API (el más reciente primero).
export function summarizeExercises(
  list: ExerciseProgress[],
): ExerciseSummary[] {
  return list
    .filter(e => e.sessions.length >= 2)
    .map((e, index) => ({ summary: summarizeExercise(e), index }))
    .sort((a, b) => b.summary.change - a.summary.change || a.index - b.index)
    .map(x => x.summary);
}

const num = (n: number) => String(round1(n)).replace('.', ',');

export const formatValue = num;

// «▲ +10 kg», «▼ −1», «= sin cambio». El color nunca dice si es bueno o malo.
export function formatChange(delta: number, unit = ''): string {
  if (Math.abs(delta) < 0.05) {
    return '= sin cambio';
  }
  const suffix = unit ? ` ${unit}` : '';
  return `${delta > 0 ? '▲ +' : '▼ −'}${num(Math.abs(delta))}${suffix}`;
}
