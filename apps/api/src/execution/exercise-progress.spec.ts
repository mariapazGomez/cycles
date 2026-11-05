import { exerciseProgressFixture } from "../../../../packages/shared/src/fixtures/exerciseProgress";
import { buildExerciseProgress, MAX_SESSIONS_PER_EXERCISE, type RawSessionExercise } from "./exercise-progress";

const day = (n: number) => new Date(Date.UTC(2026, 9, n));
const row = (over: Partial<RawSessionExercise> & { logs: RawSessionExercise["logs"] }): RawSessionExercise => ({
  sessionId: "s1",
  weekNumber: 1,
  exerciseId: "e1",
  exerciseName: "Sentadilla",
  muscleGroup: "legs",
  targetSets: 3,
  targetReps: 8,
  targetWeight: 80,
  targetRir: 2,
  ...over,
});
const log = (setNumber: number, actualReps: number, actualWeight: number | null, d: number, rir: number | null = null) => ({ setNumber, actualReps, actualWeight, rir, loggedAt: day(d) });

describe("buildExerciseProgress", () => {
  it("solo devuelve ejercicios hechos en al menos dos sesiones", () => {
    const rows = [
      row({ sessionId: "a", logs: [log(1, 8, 80, 1)] }),
      row({ sessionId: "b", logs: [log(1, 8, 82.5, 8)] }),
      row({ sessionId: "c", exerciseId: "e2", exerciseName: "Remo", logs: [log(1, 8, 50, 8)] }),
    ];
    const result = buildExerciseProgress(rows);
    expect(result.map((e) => e.exerciseId)).toEqual(["e1"]);
    expect(result[0].sessions).toHaveLength(2);
  });

  it("promedia el peso y las repeticiones de las series y deja el detalle por serie", () => {
    const rows = [
      row({ sessionId: "a", logs: [log(2, 6, 80, 1, 1), log(1, 8, 70, 1)] }),
      row({ sessionId: "b", logs: [log(1, 8, 80, 8)] }),
    ];
    const [first] = buildExerciseProgress(rows)[0].sessions;
    expect(first.actualWeight).toBe(75);
    expect(first.actualReps).toBe(7);
    expect(first.plannedWeight).toBe(80);
    expect(first.series).toEqual([
      { setNumber: 1, weight: 70, reps: 8, rir: null },
      { setNumber: 2, weight: 80, reps: 6, rir: 1 },
    ]);
  });

  it("con peso corporal el peso real es nulo, y el planificado puede serlo", () => {
    const rows = [
      row({ sessionId: "a", targetWeight: null, logs: [log(1, 10, null, 1)] }),
      row({ sessionId: "b", targetWeight: null, logs: [log(1, 12, null, 8)] }),
    ];
    const s = buildExerciseProgress(rows)[0].sessions;
    expect(s.map((x) => x.actualWeight)).toEqual([null, null]);
    expect(s.map((x) => x.plannedWeight)).toEqual([null, null]);
  });

  it("ordena las sesiones por fecha, ignora las que no tienen series y pone primero el ejercicio más reciente", () => {
    const rows = [
      row({ sessionId: "b", logs: [log(1, 8, 80, 8)] }),
      row({ sessionId: "vacía", logs: [] }),
      row({ sessionId: "a", logs: [log(1, 8, 80, 1)] }),
      row({ sessionId: "x", exerciseId: "e2", exerciseName: "Remo", logs: [log(1, 8, 50, 20)] }),
      row({ sessionId: "y", exerciseId: "e2", exerciseName: "Remo", logs: [log(1, 8, 50, 22)] }),
    ];
    const result = buildExerciseProgress(rows);
    expect(result.map((e) => e.exerciseId)).toEqual(["e2", "e1"]);
    expect(result[1].sessions.map((s) => s.sessionId)).toEqual(["a", "b"]);
  });

  it("se queda con las sesiones más recientes si hay demasiadas", () => {
    const rows = Array.from({ length: MAX_SESSIONS_PER_EXERCISE + 5 }, (_, i) =>
      row({ sessionId: `s${i}`, logs: [{ setNumber: 1, actualReps: 8, actualWeight: 80, rir: null, loggedAt: new Date(Date.UTC(2026, 0, 1 + i)) }] }),
    );
    const sessions = buildExerciseProgress(rows)[0].sessions;
    expect(sessions).toHaveLength(MAX_SESSIONS_PER_EXERCISE);
    expect(sessions[sessions.length - 1].sessionId).toBe(`s${MAX_SESSIONS_PER_EXERCISE + 4}`);
  });
});

describe("contrato con la app móvil (CYC-249)", () => {
  const log = (setNumber: number, actualWeight: number, actualReps: number, rir: number | null, loggedAt: string) => ({
    setNumber, actualWeight, actualReps, rir, loggedAt: new Date(loggedAt),
  });
  const row = (sessionId: string, weekNumber: number, targetWeight: number, logs: RawSessionExercise["logs"]): RawSessionExercise => ({
    sessionId, weekNumber, exerciseId: "ex-sentadilla", exerciseName: "Sentadilla", muscleGroup: "legs",
    targetSets: 3, targetReps: 6, targetWeight, targetRir: 2, logs,
  });

  it("lo que produce el código real coincide con el fixture que usa la app, envuelto en { exercises }", () => {
    const exercises = buildExerciseProgress([
      row("ses-1", 1, 60, [log(1, 60, 6, null, "2026-10-01T10:00:00.000Z"), log(2, 60, 6, 2, "2026-10-01T10:05:00.000Z")]),
      row("ses-2", 2, 65, [log(1, 65, 6, null, "2026-10-08T10:00:00.000Z"), log(2, 65, 5, 1, "2026-10-08T10:05:00.000Z")]),
    ]);
    expect({ exercises }).toEqual(exerciseProgressFixture);
  });
});
