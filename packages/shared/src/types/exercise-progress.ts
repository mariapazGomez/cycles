// Historial por ejercicio del atleta (GET /me/exercise-progress, CYC-239). Tipos únicos
// para la API (que los produce) y la app móvil (que los consume): si cambia la forma,
// cambia aquí y falla la compilación de los dos lados (CYC-249).
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

// Lo que responde el endpoint: un objeto, no una lista suelta.
export interface ExerciseProgressResponse {
  exercises: ExerciseProgress[];
}
