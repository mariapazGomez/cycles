import type { Exercise, RoutineWorkBlock } from "@cycles/shared";
import { CUSTOM_BLOCK_COLORS } from "@cycles/shared";
import { routineStructureFixture } from "../../../packages/shared/src/fixtures/workBlocks";
import { shapeDiff } from "../../../packages/shared/src/fixtures/resumen";
import {
  BLOCK_NAME_MAX,
  MAX_BLOCKS,
  STRUCTURE_MESSAGES,
  addBlock,
  blockColorOf,
  blockSummaryText,
  canMoveInBlock,
  groupLoose,
  moveBlock,
  moveRowInBlock,
  moveRowToBlock,
  removeBlock,
  structureFromRoutine,
  structurePayload,
  structureSignature,
  structureView,
  updateBlock,
  validateStructure,
  type Structure,
} from "../src/lib/blocksDraft";
import { newRow } from "../src/lib/routineDraft";

// CYC-275: el constructor por bloques (lógica pura).
const ex = (id: string): Exercise => ({ id, name: id, muscleGroup: "legs", isActive: true, createdAt: "" } as unknown as Exercise);
const row = (key: string, blockId: string | null = null, over: object = {}) => ({ ...newRow(key, ex(key)), reps: "8", blockId, ...over });
const empty: Structure = { blocks: [], rows: [] };

describe("bloques del constructor", () => {
  it("agrega bloques con el nombre de su tipo; el personalizado parte con color de la lista", () => {
    let s = addBlock(empty, "warmup", "b1");
    s = addBlock(s, "custom", "b2");
    expect(s.blocks.map((b) => [b.name, b.type, b.color])).toEqual([
      ["Calentamiento", "warmup", null],
      ["Nuevo bloque", "custom", CUSTOM_BLOCK_COLORS[4]],
    ]);
  });

  it("no pasa del máximo de bloques", () => {
    let s = empty;
    for (let i = 0; i < MAX_BLOCKS + 3; i++) s = addBlock(s, "strength", `b${i}`);
    expect(s.blocks).toHaveLength(MAX_BLOCKS);
  });

  it("cambiar el tipo quita el color salvo en el personalizado, y conserva el nombre elegido", () => {
    let s = addBlock(empty, "custom", "b1");
    s = updateBlock(s, "b1", { name: "Core", color: "#1fa39a" });
    expect(blockColorOf(s.blocks[0])).toBe("#1fa39a");
    s = updateBlock(s, "b1", { type: "cardio" });
    expect(s.blocks[0]).toMatchObject({ name: "Core", type: "cardio", color: null });
    s = updateBlock(s, "b1", { type: "custom" });
    expect(s.blocks[0].color).toBe(CUSTOM_BLOCK_COLORS[4]);
  });

  it("quitar un bloque quita sus ejercicios y no toca los demás", () => {
    const s: Structure = { blocks: addBlock(addBlock(empty, "warmup", "a"), "strength", "b").blocks, rows: [row("e1", "a"), row("e2", "b"), row("e3", null)] };
    expect(removeBlock(s, "a").rows.map((r) => r.key)).toEqual(["e2", "e3"]);
  });

  it("sube y baja bloques sin salirse de los bordes", () => {
    const s = addBlock(addBlock(empty, "warmup", "a"), "strength", "b");
    expect(moveBlock(s, "b", -1).blocks.map((b) => b.key)).toEqual(["b", "a"]);
    expect(moveBlock(s, "a", -1)).toBe(s);
    expect(moveBlock(s, "b", 1)).toBe(s);
  });

  it("mueve un ejercicio al final de otro bloque, o a los sueltos", () => {
    const s: Structure = { blocks: addBlock(addBlock(empty, "warmup", "a"), "strength", "b").blocks, rows: [row("e1", "a"), row("e2", "b"), row("e3", "a")] };
    const moved = moveRowToBlock(s, "e1", "b");
    expect(structureView(moved).map((v) => [v.block?.key, v.rows.map((r) => r.key)])).toEqual([["a", ["e3"]], ["b", ["e2", "e1"]]]);
    expect(moveRowToBlock(s, "e1", null).rows.find((r) => r.key === "e1")?.blockId).toBeNull();
    expect(moveRowToBlock(s, "e1", "no-existe")).toBe(s);
    expect(moveRowToBlock(s, "e1", "a")).toBe(s);
  });

  it("sube y baja un ejercicio solo dentro de su bloque", () => {
    const s: Structure = { blocks: addBlock(addBlock(empty, "warmup", "a"), "strength", "b").blocks, rows: [row("e1", "a"), row("e2", "a"), row("e3", "b")] };
    expect(canMoveInBlock(s, "e2", 1)).toBe(false);
    expect(canMoveInBlock(s, "e1", 1)).toBe(true);
    expect(moveRowInBlock(s, "e1", 1).rows.map((r) => r.key)).toEqual(["e2", "e1", "e3"]);
    expect(moveRowInBlock(s, "e2", 1)).toEqual(s);
  });

  it("«Agrupar en bloques» pone los sueltos en un bloque «Fuerza» nuevo y conserva el orden", () => {
    const s: Structure = { blocks: addBlock(empty, "warmup", "a").blocks, rows: [row("e1", "a"), row("e2"), row("e3")] };
    const g = groupLoose(s, "g1");
    expect(g.blocks.map((b) => [b.key, b.name, b.type])).toEqual([["a", "Calentamiento", "warmup"], ["g1", "Fuerza", "strength"]]);
    expect(structureView(g).map((v) => v.rows.map((r) => r.key))).toEqual([["e1"], ["e2", "e3"]]);
    expect(groupLoose(g, "g2")).toBe(g);
  });

  it("los sueltos se dibujan al final y el resumen cuenta ejercicios y series", () => {
    const s: Structure = { blocks: addBlock(empty, "warmup", "a").blocks, rows: [row("e1", "a", { sets: "2" }), row("e2", null)] };
    expect(structureView(s).map((v) => v.block?.key ?? null)).toEqual(["a", null]);
    expect(blockSummaryText([row("a", null, { sets: "2" }), row("b", null, { sets: "3" })])).toBe("2 ejercicios · 5 series");
    expect(blockSummaryText([row("a", null, { sets: "1" })])).toBe("1 ejercicio · 1 serie");
  });
});

describe("guardar la estructura", () => {
  const ready: Structure = { blocks: addBlock(empty, "warmup", "a").blocks, rows: [row("e1", "a")] };

  it("valida en orden: nombre de la rutina, bloques, ejercicios, series y reps", () => {
    expect(validateStructure(" ", ready)).toBe(STRUCTURE_MESSAGES.name);
    expect(validateStructure("R", updateBlock(ready, "a", { name: "  " }))).toBe(STRUCTURE_MESSAGES.blockName);
    expect(validateStructure("R", updateBlock(ready, "a", { name: "x".repeat(BLOCK_NAME_MAX + 1) }))).toBe(STRUCTURE_MESSAGES.blockNameLong);
    expect(validateStructure("R", { ...ready, rows: [] })).toBe(STRUCTURE_MESSAGES.empty);
    expect(validateStructure("R", { ...ready, rows: [row("e1", "a", { reps: "" })] })).toBe(STRUCTURE_MESSAGES.incomplete);
    expect(validateStructure("R", ready)).toBeNull();
  });

  it("un bloque vacío se puede guardar si hay algún ejercicio", () => {
    expect(validateStructure("R", { blocks: addBlock(ready, "cardio", "c").blocks, rows: ready.rows })).toBeNull();
  });

  it("arma el cuerpo: ids solo de los bloques que ya existían, color solo del personalizado", () => {
    let s: Structure = { blocks: [{ key: "srv", id: "srv", type: "warmup", name: " Calentamiento ", color: null, note: " sin prisa " }], rows: [row("e1", "srv"), row("e2")] };
    s = addBlock(s, "custom", "nuevo");
    s = updateBlock(s, "nuevo", { name: "Core", color: "#8a63d2" });
    s = { ...s, rows: [...s.rows, row("e3", "nuevo")] };
    const payload = structurePayload(" Piernas ", s);
    expect(payload.name).toBe("Piernas");
    expect(payload.blocks?.[0]).toMatchObject({ id: "srv", type: "warmup", name: "Calentamiento", note: "sin prisa" });
    expect(payload.blocks?.[0]).not.toHaveProperty("color");
    expect(payload.blocks?.[1]).toMatchObject({ type: "custom", name: "Core", color: "#8a63d2" });
    expect(payload.blocks?.[1]).not.toHaveProperty("id");
    expect(payload.exercises?.map((e) => e.exerciseId)).toEqual(["e2"]);
  });

  it("sin bloques manda solo `exercises`, como siempre", () => {
    const payload = structurePayload("R", { blocks: [], rows: [row("e1")] });
    expect(payload).not.toHaveProperty("blocks");
    expect(payload.exercises).toHaveLength(1);
  });

  it("tiene la misma forma que el cuerpo de ejemplo de @cycles/shared", () => {
    let s = addBlock(empty, "warmup", "a");
    s = updateBlock(s, "a", { note: "Sin prisa" });
    s = { ...s, rows: [row("e1", "a")] };
    s = { ...s, rows: [...s.rows, row("e2")] };
    const noIds = JSON.parse(JSON.stringify(structurePayload("Piernas por bloques", s), (k, v) => (k === "id" ? undefined : v)));
    expect(shapeDiff({ ...noIds, blocks: [noIds.blocks[0]] }, { ...routineStructureFixture, blocks: [routineStructureFixture.blocks![0]] })).toEqual([]);
  });

  it("carga una rutina guardada: bloques en orden y ejercicios apuntando a su bloque; uno con bloque desconocido queda suelto", () => {
    let n = 0;
    const blk = (id: string, orderIndex: number): RoutineWorkBlock => ({ id, routineId: "r", name: id, type: "strength", color: null, orderIndex, note: null });
    const routine = {
      id: "r", coachId: "c", name: "R", createdAt: "",
      blocks: [blk("b2", 2), blk("b1", 1)],
      routineExercises: [
        { id: "x1", routineId: "r", exerciseId: "e1", orderIndex: 1, defaultSets: 3, defaultReps: 8, blockId: "b1", exercise: ex("e1") },
        { id: "x2", routineId: "r", exerciseId: "e2", orderIndex: 2, defaultSets: 3, defaultReps: 8, blockId: "gone", exercise: ex("e2") },
      ],
    };
    const s = structureFromRoutine(routine as never, () => `k${++n}`);
    expect(s.blocks.map((b) => [b.key, b.id])).toEqual([["b1", "b1"], ["b2", "b2"]]);
    expect(s.rows.map((r) => r.blockId)).toEqual(["b1", null]);
  });

  it("detecta cambios respecto de lo guardado, sin mirar las claves internas", () => {
    const a = structureSignature("R", { blocks: ready.blocks, rows: [row("x1", "a")] });
    const b = structureSignature("R", { blocks: ready.blocks, rows: [{ ...row("x1", "a"), key: "otra-clave" }] });
    expect(a).toBe(b);
    expect(structureSignature("R", { blocks: ready.blocks, rows: [row("x1", "a", { reps: "9" })] })).not.toBe(a);
    expect(structureSignature("Otra", ready)).not.toBe(structureSignature("R", ready));
  });
});
