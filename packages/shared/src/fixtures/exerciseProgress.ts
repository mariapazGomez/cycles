import type { ExerciseProgressResponse } from "../types/exercise-progress";

// Respuesta de ejemplo de GET /me/exercise-progress, fijada por la prueba de la API
// (exercise-progress.spec.ts: lo que produce el código real) y usada por la prueba de
// la app. Si la forma de la respuesta cambia, fallan las dos. No se exporta desde el
// índice del paquete: solo la importan las pruebas.
export const exerciseProgressFixture: ExerciseProgressResponse = {
  exercises: [
    {
      exerciseId: "ex-sentadilla",
      name: "Sentadilla",
      muscleGroup: "legs",
      sessions: [
        {
          sessionId: "ses-1",
          weekNumber: 1,
          date: "2026-10-01T10:00:00.000Z",
          plannedSets: 3,
          plannedReps: 6,
          plannedWeight: 60,
          plannedRir: 2,
          actualWeight: 60,
          actualReps: 6,
          series: [
            { setNumber: 1, weight: 60, reps: 6, rir: null },
            { setNumber: 2, weight: 60, reps: 6, rir: 2 },
          ],
        },
        {
          sessionId: "ses-2",
          weekNumber: 2,
          date: "2026-10-08T10:00:00.000Z",
          plannedSets: 3,
          plannedReps: 6,
          plannedWeight: 65,
          plannedRir: 2,
          actualWeight: 65,
          actualReps: 5.5,
          series: [
            { setNumber: 1, weight: 65, reps: 6, rir: null },
            { setNumber: 2, weight: 65, reps: 5, rir: 1 },
          ],
        },
      ],
    },
  ],
};
