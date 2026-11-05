// Historial por ejercicio del atleta (CYC-239, diseño docs/diseno/resumen-atleta):
// para cada ejercicio que se hizo en al menos dos sesiones, una fila por sesión
// con lo planificado y lo que de verdad se cargó. Funciones puras: la consulta
// vive en ExecutionService.

export const MIN_SESSIONS = 2;
// Tope de sesiones que se devuelven por ejercicio (las más recientes).
export const MAX_SESSIONS_PER_EXERCISE = 52;

export interface ProgressSet {
  setNumber: number;
  weight: number | null;
  reps: number;
  rir: number | null;
}

export interface ProgressSession {
  sessionId: string;
  weekNumber: number;
  // Fecha de la primera serie registrada.
  date: string;
  plannedSets: number;
  plannedReps: number;
  plannedWeight: number | null;
  plannedRir: number | null;
  // Promedio de las series con peso (null si todas fueron con peso corporal).
  actualWeight: number | null;
  // Promedio de repeticiones de todas las series.
  actualReps: number;
  series: ProgressSet[];
}

export interface ExerciseProgress {
  exerciseId: string;
  name: string;
  muscleGroup: string | null;
  sessions: ProgressSession[];
}

// Lo que la consulta entrega por cada ejercicio de una sesión (solo series vigentes).
export interface RawSessionExercise {
  sessionId: string;
  weekNumber: number;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string | null;
  targetSets: number;
  targetReps: number;
  targetWeight: number | null;
  targetRir: number | null;
  logs: Array<{ setNumber: number; actualReps: number; actualWeight: number | null; rir: number | null; loggedAt: Date }>;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

export function buildExerciseProgress(rows: RawSessionExercise[]): ExerciseProgress[] {
  const byExercise = new Map<string, { name: string; muscleGroup: string | null; sessions: ProgressSession[] }>();
  for (const row of rows) {
    if (row.logs.length === 0) continue;
    const logs = [...row.logs].sort((a, b) => a.setNumber - b.setNumber);
    const weights = logs.map((l) => l.actualWeight).filter((w): w is number => w !== null);
    const session: ProgressSession = {
      sessionId: row.sessionId,
      weekNumber: row.weekNumber,
      date: new Date(Math.min(...logs.map((l) => l.loggedAt.getTime()))).toISOString(),
      plannedSets: row.targetSets,
      plannedReps: row.targetReps,
      plannedWeight: row.targetWeight,
      plannedRir: row.targetRir,
      actualWeight: weights.length > 0 ? round1(mean(weights)) : null,
      actualReps: round1(mean(logs.map((l) => l.actualReps))),
      series: logs.map((l) => ({ setNumber: l.setNumber, weight: l.actualWeight, reps: l.actualReps, rir: l.rir })),
    };
    const entry = byExercise.get(row.exerciseId) ?? { name: row.exerciseName, muscleGroup: row.muscleGroup, sessions: [] };
    entry.sessions.push(session);
    byExercise.set(row.exerciseId, entry);
  }

  const result: ExerciseProgress[] = [];
  for (const [exerciseId, entry] of byExercise) {
    if (entry.sessions.length < MIN_SESSIONS) continue;
    const sessions = entry.sessions.sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_SESSIONS_PER_EXERCISE);
    result.push({ exerciseId, name: entry.name, muscleGroup: entry.muscleGroup, sessions });
  }
  // Primero el que se entrenó más recientemente.
  return result.sort((a, b) => b.sessions[b.sessions.length - 1].date.localeCompare(a.sessions[a.sessions.length - 1].date));
}
