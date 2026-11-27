import { buildStructure, draftSignature, moveRow, newRow, panelGroups, panelRows, peopleOf, reachOf, readOnlyReason, undoStructure } from "../src/lib/teamPanel";
import { structureOf } from "../src/lib/teamCycle";
import type { TeamSession, TeamSessionCopy } from "../src/services/teamCyclesApi";

const today = "2026-11-26";
const exercise = (id: string, orderIndex: number, blockId: string | null, over: object = {}) => ({
  id,
  exerciseId: `cat-${id}`,
  blockId,
  orderIndex,
  targetSets: 3,
  targetReps: 8,
  targetWeight: null,
  targetPercentRm: null,
  targetRestSeconds: null,
  targetRir: null,
  note: null,
  exercise: { id: `cat-${id}`, name: `Ejercicio ${id}`, muscleGroup: "legs" },
  ...over,
});
const copy = (athleteId: string, over: Partial<TeamSessionCopy> = {}): TeamSessionCopy => ({ sessionId: `s-${athleteId}`, athleteId, status: "pending", adjusted: false, scheduledDate: "2026-11-27T00:00:00.000Z", skip: null, ...over });
const session = {
  id: "m1",
  name: "Fuerza",
  scheduledDate: "2026-11-27T00:00:00.000Z",
  blocks: [{ id: "b1", name: "Calentamiento", type: "warmup", color: null, note: null, orderIndex: 1 }],
  exercises: [
    exercise("suelto", 3, null, { targetRestSeconds: 90, targetRir: 2, note: "Controla la bajada", targetWeight: 62.5 }),
    exercise("a", 1, "b1"),
    exercise("b", 2, "b1", { targetPercentRm: 75 }),
  ],
  copies: [],
} as unknown as TeamSession;
const athletes = ["ana", "beto", "carla", "dani", "eva", "fer"].map((id) => ({ athleteId: id, name: id[0].toUpperCase() + id.slice(1), cycleId: id, status: "active" }));
const cycle = { athletes, status: "active" as const, endDate: "2026-12-13T00:00:00.000Z" };

describe("panel de la sesión del equipo", () => {
  it("muestra por bloques y, sin cambios, guarda lo mismo (con descanso, RIR y nota)", () => {
    const rows = panelRows(session);
    expect(panelGroups(session, rows).map((g) => [g.name, g.rows.map((r) => r.key)])).toEqual([
      ["Calentamiento", ["a", "b"]],
      [null, ["suelto"]],
    ]);
    expect(JSON.parse(JSON.stringify(buildStructure(session, rows).input))).toEqual(JSON.parse(JSON.stringify(structureOf(session))));
  });

  it("agrega al final sin bloque, reordena dentro del grupo y quita un bloque vacío", () => {
    const rows = panelRows(session);
    const added = newRow("1", { id: "cat-nuevo", name: "Plancha", muscleGroup: "core" } as never);
    // Sin repeticiones no se puede guardar.
    expect(buildStructure(session, [...rows, added]).badReps).toEqual(new Set([added.key]));
    const input = buildStructure(session, [...rows, { ...added, reps: "10" }]).input!;
    expect(input.exercises!.map((e) => [e.id, e.exerciseId])).toEqual([
      ["suelto", "cat-suelto"],
      [undefined, "cat-nuevo"],
    ]);
    expect(moveRow(rows, "b", -1).map((r) => r.key)).toEqual(["b", "a", "suelto"]);
    expect(moveRow(rows, "b", 1)).toBe(rows);
    expect(moveRow(rows, "suelto", -1)).toBe(rows);
    expect(buildStructure(session, rows.filter((r) => r.key === "suelto")).input!.blocks).toEqual([]);
    expect(buildStructure(session, []).input).toBeNull();
  });

  it("marca lo que no sirve y nota cualquier cambio, aunque esté a medias", () => {
    const rows = panelRows(session);
    const broken = rows.map((r) => (r.key === "a" ? { ...r, sets: "abc", restSeconds: "1,5" } : r));
    const built = buildStructure(session, broken);
    expect(built.input).toBeNull();
    expect([...built.badSets, ...built.badRest]).toEqual(["a", "a"]);
    expect(draftSignature(broken)).not.toBe(draftSignature(rows));
    expect(draftSignature(panelRows(session))).toBe(draftSignature(rows));
  });

  it("deshacer vuelve a crear lo que se quitó, sin los ids que ya no existen", () => {
    const previous = structureOf(session);
    const removed = buildStructure(session, panelRows(session).filter((r) => r.key === "suelto")).input!;
    const undo = undoStructure(previous, removed);
    expect(undo.blocks![0].id).toBeUndefined();
    expect(undo.blocks![0].exercises.map((e) => [e.id, e.exerciseId])).toEqual([
      [undefined, "cat-a"],
      [undefined, "cat-b"],
    ]);
    expect(undo.exercises!.map((e) => e.id)).toEqual(["suelto"]);
    // Si no se quitó nada, conserva todos los ids.
    expect(undoStructure(previous, previous)).toEqual(previous);
  });

  it("dice a quién llega y por qué no a los demás, también a quien no tiene la sesión", () => {
    const withCopies = {
      ...session,
      copies: [
        copy("ana"),
        copy("beto", { status: "completed", skip: "recorded" }),
        copy("carla", { skip: "recorded" }),
        copy("dani", { adjusted: true, skip: "adjusted", scheduledDate: "2026-11-28T00:00:00.000Z" }),
        copy("eva", { skip: "past", scheduledDate: "2026-11-25T00:00:00.000Z" }),
      ],
    };
    const { reach, excluded } = reachOf(cycle, withCopies);
    expect(reach).toBe(1);
    expect(excluded.map((x) => `${x.name}: ${x.reason}`)).toEqual([
      "Beto: ya la hizo",
      "Carla: ya la empezó o tiene registro",
      "Dani: tiene la sesión ajustada, movida al sábado 28",
      "Eva: la tiene el miércoles 25, un día pasado",
      "Fer: no tiene esta sesión",
    ]);
    expect(peopleOf(cycle, withCopies).find((p) => p.athleteId === "dani")!.state).toBe("Sin hacer, ajustada, movida al sábado 28");
    expect(peopleOf(cycle, withCopies).find((p) => p.athleteId === "beto")).toMatchObject({ state: "Hecha", done: true });
  });

  it("es de solo lectura en un día pasado, sin nadie que reciba o con el ciclo cerrado", () => {
    expect(readOnlyReason(cycle, session, today, 3)).toBeNull();
    expect(readOnlyReason(cycle, session, "2026-11-28", 3)).toMatch(/día pasado/);
    expect(readOnlyReason(cycle, session, today, 0)).toMatch(/Nadie recibiría/);
    expect(readOnlyReason({ ...cycle, status: "archived" }, session, today, 3)).toMatch(/archivado/);
    expect(readOnlyReason(cycle, session, "2026-12-14", 3)).toBe("El ciclo terminó.");
  });
});
