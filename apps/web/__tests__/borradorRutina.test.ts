import type { Exercise, RoutineWorkBlock } from "@cycles/shared";
import { routineStructureFixture } from "../../../packages/shared/src/fixtures/workBlocks";
import { shapeDiff } from "../../../packages/shared/src/fixtures/resumen";
import {
  DRAFT_MESSAGES,
  canMoveRow,
  draftPayload,
  duplicateRowIn,
  moveRowIn,
  newRow,
  removeRowFrom,
  rowsFromRoutine,
  updateRowIn,
  validateDraft,
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

  it("valida en el mismo orden que antes: nombre, ejercicios, series y reps", () => {
    expect(validateDraft("  ", [ready("a")])).toBe(DRAFT_MESSAGES.name);
    expect(validateDraft("Piernas", [])).toBe(DRAFT_MESSAGES.empty);
    expect(validateDraft("Piernas", [{ ...ready("a"), reps: "" }])).toBe(DRAFT_MESSAGES.incomplete);
    expect(validateDraft("Piernas", [{ ...ready("a"), sets: "0" }])).toBe(DRAFT_MESSAGES.incomplete);
    expect(validateDraft(" Piernas ", [ready("a")])).toBeNull();
  });

  it("los mensajes son los textos de siempre", () => {
    expect(DRAFT_MESSAGES).toEqual({
      name: "Ponle un nombre a la rutina.",
      empty: "Agrega al menos un ejercicio.",
      incomplete: "Completa series y reps de todos los ejercicios.",
      save: "No se pudo guardar la rutina.",
    });
  });

  it("arma el cuerpo a guardar: nombre sin espacios, números y opcionales", () => {
    const row = { ...ready("a"), sets: "4", reps: "6", weight: "72,5", restSeconds: "90", rir: "2", note: "  baja lento  " };
    expect(draftPayload("  Piernas ", [row, ready("b")])).toEqual({
      name: "Piernas",
      exercises: [
        { exerciseId: "a", defaultSets: 4, defaultReps: 6, defaultWeight: 72.5, defaultRestSeconds: 90, defaultRir: 2, note: "baja lento" },
        { exerciseId: "b", defaultSets: 3, defaultReps: 8, defaultWeight: undefined, defaultRestSeconds: undefined, defaultRir: undefined, note: undefined },
      ],
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

  describe("bloques (CYC-275, paso 3)", () => {
    const blk = (id: string, orderIndex: number, over: Partial<RoutineWorkBlock> = {}): RoutineWorkBlock => ({
      id, routineId: "r", name: id, type: "strength", color: null, orderIndex, note: null, ...over,
    });
    const inBlock = (key: string, blockId: string | null) => ({ ...ready(key), blockId });

    it("guarda cada bloque con sus ejercicios en orden y los sueltos al final", () => {
      const rows = [inBlock("a", "b1"), inBlock("b", "b2"), inBlock("c", "b1"), inBlock("d", null)];
      const payload = draftPayload("Piernas", rows, [blk("b2", 2, { type: "custom", color: "#8a63d2", note: "Core" }), blk("b1", 1, { type: "warmup" })]);
      expect(payload.blocks?.map((b) => [b.id, b.type, b.exercises.map((e) => e.exerciseId)])).toEqual([
        ["b1", "warmup", ["a", "c"]],
        ["b2", "custom", ["b"]],
      ]);
      expect(payload.blocks?.[1]).toMatchObject({ color: "#8a63d2", note: "Core" });
      expect(payload.blocks?.[0]).not.toHaveProperty("color");
      expect(payload.exercises?.map((e) => e.exerciseId)).toEqual(["d"]);
    });

    it("un ejercicio de un bloque que ya no existe pasa a suelto, no se pierde", () => {
      const payload = draftPayload("R", [inBlock("a", "borrado")], [blk("b1", 1)]);
      expect(payload.blocks?.[0].exercises).toEqual([]);
      expect(payload.exercises?.map((e) => e.exerciseId)).toEqual(["a"]);
    });

    it("una rutina sin bloques manda solo `exercises`, como siempre", () => {
      const payload = draftPayload("R", [ready("a")]);
      expect(payload).not.toHaveProperty("blocks");
      expect(payload.exercises).toHaveLength(1);
    });

    it("las flechas no cruzan de un bloque a otro, y duplicar deja la copia en el mismo bloque", () => {
      const rows = [inBlock("a", "b1"), inBlock("b", "b1"), inBlock("c", "b2")];
      expect(canMoveRow(rows, 1, 1)).toBe(false);
      expect(canMoveRow(rows, 2, -1)).toBe(false);
      expect(canMoveRow(rows, 0, 1)).toBe(true);
      expect(moveRowIn(rows, 1, 1)).toBe(rows);
      expect(duplicateRowIn(rows, 1, "b2copy")[2]).toMatchObject({ key: "b2copy", blockId: "b1" });
    });

    it("lo que envía la web tiene la misma forma que el cuerpo de ejemplo de @cycles/shared", () => {
      const rows = [inBlock("a", "b1"), inBlock("b", "b2"), inBlock("c", "b3"), inBlock("d", null)];
      const payload = draftPayload("Piernas por bloques", rows, [blk("b1", 1, { type: "warmup", note: "Sin prisa" }), blk("b2", 2, { type: "custom", color: "#8a63d2" }), blk("b3", 3)]);
      const noIds = JSON.parse(JSON.stringify(payload, (k, v) => (k === "id" ? undefined : v)));
      // Los campos opcionales (nota, color) cambian de un bloque a otro: se compara el primero.
      expect(shapeDiff({ ...noIds, blocks: [noIds.blocks[0]] }, { ...routineStructureFixture, blocks: [routineStructureFixture.blocks![0]] })).toEqual([]);
    });
  });
});
