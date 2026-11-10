import type { Exercise } from "@cycles/shared";
import {
  DRAFT_MESSAGES,
  canMoveRow,
  duplicateRowIn,
  moveRowIn,
  newRow,
  removeRowFrom,
  rowsFromRoutine,
  updateRowIn,
  routineSummaryLine,
} from "../src/lib/routineDraft";

// CYC-275, paso 1: el cajón y el editor de la Biblioteca comparten la lógica del borrador.
const exercise = (id: string, name: string): Exercise => ({ id, name, muscleGroup: "legs", isActive: true, createdAt: "2026-01-01" } as unknown as Exercise);
const ready = (key: string, name = "Sentadilla") => ({ ...newRow(key, exercise(key, name)), reps: "8" });

describe("borrador de rutina", () => {
  it("una fila nueva parte con 3 series y sin repeticiones", () => {
    const row = newRow("k1", exercise("e1", "Sentadilla"));
    expect(row).toMatchObject({ key: "k1", exerciseId: "e1", name: "Sentadilla", sets: "3", reps: "", weight: "", note: "" });
  });

  it("mueve, duplica y quita sin tocar los demás ni salirse de los bordes", () => {
    const rows = [ready("a"), ready("b"), ready("c")];
    expect(moveRowIn(rows, 1, -1).map((r) => r.key)).toEqual(["b", "a", "c"]);
    expect(moveRowIn(rows, 0, -1)).toBe(rows);
    expect(moveRowIn(rows, 2, 1)).toBe(rows);
    expect(duplicateRowIn(rows, 0, "a2").map((r) => r.key)).toEqual(["a", "a2", "b", "c"]);
    expect(duplicateRowIn(rows, 0, "a2")[1]).toMatchObject({ exerciseId: "a", reps: "8" });
    expect(duplicateRowIn(rows, 9, "x")).toBe(rows);
    expect(removeRowFrom(rows, "b").map((r) => r.key)).toEqual(["a", "c"]);
  });

  it("actualiza solo la fila pedida", () => {
    const rows = updateRowIn([ready("a"), ready("b")], "b", { reps: "12" });
    expect(rows.map((r) => r.reps)).toEqual(["8", "12"]);
  });


  it("los mensajes son los textos de siempre", () => {
    expect(DRAFT_MESSAGES).toEqual({
      name: "Ponle un nombre a la rutina.",
      empty: "Agrega al menos un ejercicio.",
      incomplete: "Completa series y reps de todos los ejercicios.",
      save: "No se pudo guardar la rutina.",
    });
  });


  it("carga las filas desde una rutina guardada, con claves nuevas y en orden", () => {
    let n = 0;
    const routine = {
      id: "r1", coachId: "c", name: "Piernas", createdAt: "",
      routineExercises: [
        { id: "x1", routineId: "r1", exerciseId: "e1", orderIndex: 0, defaultSets: 4, defaultReps: 6, defaultWeight: 70, defaultRestSeconds: null, defaultRir: 2, note: "Cuida la rodilla", exercise: exercise("e1", "Sentadilla") },
      ],
    };
    const rows = rowsFromRoutine(routine as never, () => `k${++n}`);
    expect(rows).toEqual([expect.objectContaining({ key: "k1", exerciseId: "e1", sets: "4", reps: "6", weight: "70", restSeconds: "", rir: "2", note: "Cuida la rodilla" })]);
    expect(rowsFromRoutine(null, () => "k")).toEqual([]);
  });
});
