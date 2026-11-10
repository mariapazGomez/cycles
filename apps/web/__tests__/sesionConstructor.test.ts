import type { ExerciseLog, SessionWorkBlock } from "@cycles/shared";
import { sessionStructureFixture } from "../../../packages/shared/src/fixtures/workBlocks";
import { shapeDiff } from "../../../packages/shared/src/fixtures/resumen";
import { duplicateRowIn } from "../src/lib/routineDraft";
import {
  SESSION_MESSAGES,
  hasLoggedRows,
  isSessionLocked,
  loggedResult,
  metaChanges,
  sessionMeta,
  sessionPayload,
  structureFromSession,
  validateSessionStructure,
} from "../src/lib/sessionDraft";

// CYC-275, PR 3: la sesión del coach en el constructor (lógica pura).
const log = (n: number, reps: number, weight: number | null): ExerciseLog => ({
  id: `l${n}`, sessionExerciseId: "se1", athleteId: "a", setNumber: n, actualReps: reps, actualWeight: weight, rir: null, supersedesId: null, loggedAt: "",
});
const blk = (id: string, orderIndex: number, over: Partial<SessionWorkBlock> = {}): SessionWorkBlock => ({ id, sessionId: "s", name: id, type: "strength", color: null, orderIndex, note: null, ...over });
const se = (id: string, orderIndex: number, blockId: string | null, over: object = {}) => ({
  id, sessionId: "s", exerciseId: `ex-${id}`, orderIndex, targetSets: 3, targetReps: 8, blockId, exercise: { id: `ex-${id}`, name: `Ejercicio ${id}`, muscleGroup: "legs" }, logs: [], ...over,
});
const session = (over: object = {}) => ({
  id: "s", cycleId: "c", name: "Piernas", weekNumber: 1, slotNumber: 1, status: "pending", scheduledDate: "2026-11-13T00:00:00.000Z",
  blocks: [blk("b2", 2), blk("b1", 1, { type: "warmup" })],
  sessionExercises: [se("e1", 1, "b1", { targetWeight: 70, targetRestSeconds: 90, targetRir: 2, note: "Lento" }), se("e2", 2, "b2"), se("e3", 3, null)],
  cycle: {}, ...over,
}) as never;

describe("lo que registró el atleta", () => {
  it("resume series iguales como «3 × 8 a 62 kg»", () => {
    expect(loggedResult([log(1, 8, 62), log(2, 8, 62), log(3, 8, 62)])).toBe("Registró 3 × 8 a 62 kg");
    expect(loggedResult([log(1, 8, null)])).toBe("Registró 1 × 8");
  });
  it("si las series difieren, solo cuenta cuántas", () => {
    expect(loggedResult([log(1, 8, 60), log(2, 6, 60)])).toBe("Registró 2 series");
    expect(loggedResult([log(1, 8, 60)].slice(0, 0))).toBeUndefined();
    expect(loggedResult(undefined)).toBeUndefined();
  });
});

describe("sesión → borrador", () => {
  it("bloques en orden y ejercicios con su bloque, su id y lo escrito en texto", () => {
    let n = 0;
    const s = structureFromSession(session(), () => `k${++n}`);
    expect(s.blocks.map((b) => [b.key, b.id])).toEqual([["b1", "b1"], ["b2", "b2"]]);
    expect(s.rows.map((r) => [r.sessionExerciseId, r.blockId])).toEqual([["e1", "b1"], ["e2", "b2"], ["e3", null]]);
    expect(s.rows[0]).toMatchObject({ sets: "3", reps: "8", weight: "70", restSeconds: "90", rir: "2", note: "Lento", name: "Ejercicio e1" });
  });

  it("un ejercicio con un bloque desconocido queda suelto, y las series registradas se marcan", () => {
    const s = structureFromSession(session({ sessionExercises: [se("e1", 1, "gone", { logs: [log(1, 8, 50), log(2, 8, 50)] })] }), () => "k");
    expect(s.rows[0]).toMatchObject({ blockId: null, loggedCount: 2, result: "Registró 2 × 8 a 50 kg" });
    expect(hasLoggedRows(s.rows)).toBe(true);
  });

  it("una sesión hecha, omitida o con series se abre bloqueada; una pendiente sin series, no", () => {
    expect(isSessionLocked({ status: "pending", sessionExercises: [se("a", 1, null)] as never })).toBe(false);
    expect(isSessionLocked({ status: "completed", sessionExercises: [] })).toBe(true);
    expect(isSessionLocked({ status: "skipped", sessionExercises: [] })).toBe(true);
    expect(isSessionLocked({ status: "pending", sessionExercises: [se("a", 1, null, { logs: [log(1, 8, 0)] })] as never })).toBe(true);
  });

  it("duplicar un ejercicio de la sesión crea uno nuevo: sin id ni series del original", () => {
    const s = structureFromSession(session({ sessionExercises: [se("e1", 1, null, { logs: [log(1, 8, 50)] })] }), () => "k1");
    const copy = duplicateRowIn(s.rows, 0, "k2")[1];
    expect(copy).toMatchObject({ key: "k2", sessionExerciseId: undefined, loggedCount: undefined, result: undefined });
  });
});

describe("guardar la sesión", () => {
  it("el cuerpo conserva los ids de lo que ya existía y deja sin id lo nuevo", () => {
    let n = 0;
    const s = structureFromSession(session(), () => `k${++n}`);
    const payload = sessionPayload({ ...s, rows: [...s.rows, { ...s.rows[2], key: "nuevo", sessionExerciseId: undefined }] });
    expect(payload.blocks?.map((b) => [b.id, b.exercises.map((e) => e.id)])).toEqual([["b1", ["e1"]], ["b2", ["e2"]]]);
    expect(payload.exercises?.map((e) => e.id)).toEqual(["e3", undefined]);
    expect(payload.blocks?.[0].exercises[0]).toEqual({ id: "e1", exerciseId: "ex-e1", targetSets: 3, targetReps: 8, targetWeight: 70, targetRestSeconds: 90, targetRir: 2, note: "Lento" });
  });

  it("tiene la misma forma que el cuerpo de ejemplo de @cycles/shared", () => {
    const s = structureFromSession(session(), () => "k");
    const noIds = JSON.parse(JSON.stringify(sessionPayload(s), (k, v) => (k === "id" ? undefined : v)));
    expect(shapeDiff({ ...noIds, blocks: [{ ...noIds.blocks[0], exercises: [{ exerciseId: "x", targetSets: 1, targetReps: 1 }] }] }, { ...sessionStructureFixture, blocks: [sessionStructureFixture.blocks![0]] })).toEqual([]);
  });

  it("una sesión puede quedar sin ejercicios, pero pide nombre y filas completas", () => {
    expect(validateSessionStructure("Piernas", { blocks: [], rows: [] })).toBeNull();
    expect(validateSessionStructure("  ", { blocks: [], rows: [] })).toBe(SESSION_MESSAGES.name);
    const s = structureFromSession(session(), () => "k");
    expect(validateSessionStructure("Piernas", { ...s, rows: [{ ...s.rows[0], reps: "" }] })).toContain("series y reps");
  });

  it("solo manda lo que cambió del nombre, la fecha y el estado", () => {
    const before = sessionMeta({ name: "Piernas", scheduledDate: "2026-11-13T00:00:00.000Z", status: "pending" });
    expect(before).toEqual({ name: "Piernas", date: "2026-11-13", status: "pending" });
    expect(metaChanges(before, before)).toEqual({});
    expect(metaChanges(before, { name: "  Piernas B ", date: "2026-11-14", status: "completed" })).toEqual({ name: "Piernas B", scheduledDate: "2026-11-14", status: "completed" });
    expect(metaChanges(before, { ...before, date: "" })).toEqual({});
  });
});
