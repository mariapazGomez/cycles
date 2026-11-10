import { resetDatabase, startApp, type TestApp } from "./support/app";
import { seedScenario, type Scenario } from "./support/seed";
import { CUSTOM_BLOCK_COLORS as API_COLORS, BLOCK_TYPES as API_TYPES } from "../src/common/work-blocks";
import { CUSTOM_BLOCK_COLORS, WORK_BLOCK_TYPES } from "../../../packages/shared/src/types/work-block";
import { routineStructureFixture, sessionStructureFixture } from "../../../packages/shared/src/fixtures/workBlocks";

// Estructura completa de rutinas y sesiones (CYC-275): bloques y ejercicios en orden, en
// una sola llamada. Los cuerpos de ejemplo son los de @cycles/shared.

const withExercise = <T>(value: T, exerciseId: string): T => JSON.parse(JSON.stringify(value).replaceAll("ex-1", exerciseId));

describe("Estructura completa con bloques", () => {
  let app: TestApp;
  let c: Scenario;
  let routineId: string;

  const routineBody = () => withExercise(routineStructureFixture, c.globalExercise);
  const sessionBody = () => withExercise(sessionStructureFixture, c.globalExercise);

  beforeAll(async () => {
    app = await startApp();
    await resetDatabase(app.prisma);
    c = await seedScenario(app);
  });
  afterAll(async () => {
    await app?.close();
  });

  it("los tipos y colores de la API son los de @cycles/shared", () => {
    expect([...API_TYPES]).toEqual([...WORK_BLOCK_TYPES]);
    expect([...API_COLORS]).toEqual([...CUSTOM_BLOCK_COLORS]);
  });

  describe("rutinas", () => {
    it("crea una rutina con bloques y ejercicios sueltos, todo en orden", async () => {
      const res = await app.http("post", "/routines", c.token.coachA).send(routineBody());
      expect(res.status).toBe(201);
      routineId = res.body.id;
      expect(res.body.blocks.map((b: { name: string; type: string; color: string | null }) => [b.name, b.type, b.color])).toEqual([
        ["Calentamiento", "warmup", null],
        ["Core", "custom", "#8a63d2"],
        ["Fuerza", "strength", null],
      ]);
      const byBlock = res.body.routineExercises.map((e: { blockId: string | null }) => res.body.blocks.findIndex((b: { id: string }) => b.id === e.blockId));
      expect(byBlock).toEqual([0, 1, 2, -1]);
      expect(res.body.routineExercises.map((e: { orderIndex: number }) => e.orderIndex)).toEqual([1, 2, 3, 4]);
      expect(res.body.routineExercises[2]).toMatchObject({ defaultWeight: 70, defaultRir: 2, note: "Baja lento" });
    });

    it("lo que se envía coincide con lo que se lee: guardar de nuevo lo leído no cambia nada", async () => {
      const read = await app.http("get", `/routines/${routineId}`, c.token.coachA);
      const body = {
        blocks: read.body.blocks.map((b: { id: string; type: string; name: string; color: string | null; note: string | null }) => ({
          id: b.id, type: b.type, name: b.name, ...(b.color ? { color: b.color } : {}), ...(b.note ? { note: b.note } : {}),
          exercises: read.body.routineExercises.filter((e: { blockId: string }) => e.blockId === b.id).map(toInput),
        })),
        exercises: read.body.routineExercises.filter((e: { blockId: string | null }) => e.blockId === null).map(toInput),
      };
      const saved = await app.http("patch", `/routines/${routineId}`, c.token.coachA).send(body);
      expect(saved.status).toBe(200);
      expect(saved.body.blocks.map((b: { id: string }) => b.id)).toEqual(read.body.blocks.map((b: { id: string }) => b.id));
      expect(saved.body.routineExercises.map((e: { exerciseId: string; blockId: string | null; orderIndex: number }) => [e.exerciseId, e.blockId, e.orderIndex]))
        .toEqual(read.body.routineExercises.map((e: { exerciseId: string; blockId: string | null; orderIndex: number }) => [e.exerciseId, e.blockId, e.orderIndex]));
    });

    it("reordena y mueve ejercicios entre bloques, renombra y quita un bloque", async () => {
      const read = await app.http("get", `/routines/${routineId}`, c.token.coachA);
      const [cal, core, fuerza] = read.body.blocks;
      const ex = (n: number) => ({ exerciseId: c.globalExercise, defaultSets: n, defaultReps: 5 });
      const res = await app.http("patch", `/routines/${routineId}`, c.token.coachA).send({
        blocks: [
          { id: fuerza.id, type: "strength", name: "Fuerza principal", exercises: [ex(4), ex(5)] },
          { id: cal.id, type: "warmup", name: "Calentamiento", exercises: [ex(2)] },
        ],
      });
      expect(res.status).toBe(200);
      expect(res.body.blocks.map((b: { id: string; name: string }) => [b.id, b.name])).toEqual([[fuerza.id, "Fuerza principal"], [cal.id, "Calentamiento"]]);
      expect(res.body.routineExercises.map((e: { defaultSets: number }) => e.defaultSets)).toEqual([4, 5, 2]);
      expect(await app.prisma.routineBlock.count({ where: { id: core.id } })).toBe(0);
    });

    it("sin bloques ni ejercicios solo cambia el nombre y deja la estructura", async () => {
      const res = await app.http("patch", `/routines/${routineId}`, c.token.coachA).send({ name: "Solo el nombre" });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Solo el nombre");
      expect(res.body.blocks).toHaveLength(2);
      expect(res.body.routineExercises).toHaveLength(3);
    });

    it("el formato anterior (solo `exercises`) sigue funcionando y deja la rutina sin bloques", async () => {
      const created = await app.http("post", "/routines", c.token.coachA).send({ name: "Antigua", exercises: [{ exerciseId: c.globalExercise, defaultSets: 3, defaultReps: 8 }] });
      expect(created.status).toBe(201);
      expect(created.body.blocks).toEqual([]);
      expect(created.body.routineExercises[0].blockId).toBeNull();
    });

    it("rechaza lo que no se puede guardar, sin dejar nada a medias", async () => {
      const bad = async (body: object, text: string) => {
        const res = await app.http("patch", `/routines/${routineId}`, c.token.coachA).send(body);
        expect(res.status).toBe(400);
        expect(JSON.stringify(res.body)).toContain(text);
      };
      const ex = { exerciseId: c.globalExercise, defaultSets: 3, defaultReps: 8 };
      await bad({ blocks: [{ type: "superset", name: "S", exercises: [ex] }] }, "superseries");
      await bad({ blocks: [{ type: "warmup", name: "C", color: "#8a63d2", exercises: [ex] }] }, "personalizado");
      await bad({ blocks: [{ type: "custom", name: "C", color: "#1a66dd", exercises: [ex] }] }, "colores");
      await bad({ blocks: [{ type: "warmup", name: "  ", exercises: [ex] }] }, "nombre");
      await bad({ blocks: [{ type: "nada", name: "X", exercises: [ex] }] }, "tipo de bloque");
      await bad({ blocks: [{ id: "de-otra-rutina", type: "warmup", name: "X", exercises: [ex] }] }, "no es de esta rutina");
      await bad({ blocks: [{ type: "warmup", name: "X", exercises: [] }] }, "al menos un ejercicio");
      await bad({ blocks: [{ type: "warmup", name: "X", exercises: [{ ...ex, exerciseId: c.exerciseB }] }] }, "no está disponible");
      const after = await app.http("get", `/routines/${routineId}`, c.token.coachA);
      expect(after.body.blocks).toHaveLength(2);
      expect(after.body.routineExercises).toHaveLength(3);
    });

    it("un bloque de otra rutina no se puede tomar prestado", async () => {
      const other = await app.http("post", "/routines", c.token.coachA).send(routineBody());
      const foreign = other.body.blocks[0].id;
      const res = await app.http("patch", `/routines/${routineId}`, c.token.coachA).send({
        blocks: [{ id: foreign, type: "warmup", name: "Ajeno", exercises: [{ exerciseId: c.globalExercise, defaultSets: 1, defaultReps: 1 }] }],
      });
      expect(res.status).toBe(400);
      expect(await app.prisma.routineBlock.count({ where: { id: foreign, routineId: other.body.id } })).toBe(1);
    });

    it("editar la rutina no cambia las sesiones ya asignadas", async () => {
      const session = await app.http("post", `/cycles/${c.cycleA}/sessions`, c.token.coachA).send({ routineId, weekNumber: 5, slotNumber: 1 });
      expect(session.status).toBe(201);
      const before = await app.http("get", `/sessions/${session.body.id}`, c.token.coachA);
      await app.http("patch", `/routines/${routineId}`, c.token.coachA).send({
        blocks: [{ type: "cardio", name: "Cardio", exercises: [{ exerciseId: c.globalExercise, defaultSets: 9, defaultReps: 9 }] }],
      });
      const after = await app.http("get", `/sessions/${session.body.id}`, c.token.coachA);
      expect(after.body.blocks).toEqual(before.body.blocks);
      expect(after.body.sessionExercises.map((e: { targetSets: number }) => e.targetSets)).toEqual(before.body.sessionExercises.map((e: { targetSets: number }) => e.targetSets));
    });
  });

  describe("sesiones", () => {
    let sessionId: string;
    let exerciseIds: string[];

    beforeAll(async () => {
      const created = await app.http("post", "/routines", c.token.coachA).send(routineBody());
      const session = await app.http("post", `/cycles/${c.cycleA}/sessions`, c.token.coachA).send({ routineId: created.body.id, weekNumber: 6, slotNumber: 1 });
      sessionId = session.body.id;
      exerciseIds = session.body.sessionExercises.map((e: { id: string }) => e.id);
    });

    const read = async () => (await app.http("get", `/sessions/${sessionId}`, c.token.coachA)).body;

    it("guarda la estructura completa de una sesión con el cuerpo de ejemplo", async () => {
      const res = await app.http("put", `/sessions/${sessionId}/structure`, c.token.coachA).send(sessionBody());
      expect(res.status).toBe(200);
      expect(res.body.blocks.map((b: { name: string }) => b.name)).toEqual(["Calentamiento", "Fuerza"]);
      expect(res.body.sessionExercises.map((e: { orderIndex: number }) => e.orderIndex)).toEqual([1, 2, 3]);
      expect(res.body.sessionExercises.map((e: { blockId: string | null }) => e.blockId === null)).toEqual([false, false, true]);
      exerciseIds = res.body.sessionExercises.map((e: { id: string }) => e.id);
    });

    it("lo que ya existe conserva su id; las series registradas no se pierden", async () => {
      const current = await read();
      const [first] = current.sessionExercises;
      await app.prisma.exerciseLog.create({ data: { sessionExerciseId: first.id, athleteId: c.userId.athleteA, setNumber: 1, actualReps: 8, actualWeight: 40 } });
      const blocks = current.blocks.map((b: { id: string; type: string; name: string }) => ({
        id: b.id, type: b.type, name: b.name,
        exercises: current.sessionExercises.filter((e: { blockId: string }) => e.blockId === b.id).map(toSessionInput),
      }));
      // Se mueve el primero (con series) al otro bloque y se cambia su peso.
      const moved = blocks[0].exercises.splice(0, 1)[0];
      blocks[1].exercises.unshift({ ...moved, targetWeight: 45 });
      const res = await app.http("put", `/sessions/${sessionId}/structure`, c.token.coachA).send({ blocks, exercises: [] });
      expect(res.status).toBe(200);
      expect(res.body.sessionExercises.some((e: { id: string; blockId: string; targetWeight: number }) => e.id === first.id && e.blockId === blocks[1].id && e.targetWeight === 45)).toBe(true);
      expect(await app.prisma.exerciseLog.count({ where: { sessionExerciseId: first.id } })).toBe(1);
    });

    it("no deja quitar ni cambiar un ejercicio con series registradas", async () => {
      const current = await read();
      const logged = current.sessionExercises.find((e: { id: string }) => e.id === exerciseIds[0]);
      const rest = current.sessionExercises.filter((e: { id: string }) => e.id !== logged.id).map(toSessionInput);
      const removed = await app.http("put", `/sessions/${sessionId}/structure`, c.token.coachA).send({ exercises: rest });
      expect(removed.status).toBe(409);
      const swapped = await app.http("put", `/sessions/${sessionId}/structure`, c.token.coachA).send({
        exercises: [...rest, { ...toSessionInput(logged), exerciseId: c.exerciseA }],
      });
      expect(swapped.status).toBe(409);
      expect((await read()).sessionExercises).toHaveLength(current.sessionExercises.length);
    });

    it("rechaza ids que no son de la sesión y ejercicios no disponibles", async () => {
      const ex = { exerciseId: c.globalExercise, targetSets: 1, targetReps: 1 };
      const foreignExercise = await app.http("put", `/sessions/${sessionId}/structure`, c.token.coachA).send({ exercises: [{ ...ex, id: c.seA }] });
      expect(foreignExercise.status).toBe(400);
      const foreignBlock = await app.http("put", `/sessions/${sessionId}/structure`, c.token.coachA).send({ blocks: [{ id: "x", type: "warmup", name: "X", exercises: [ex] }] });
      expect(foreignBlock.status).toBe(400);
      const current = (await read()).sessionExercises.map(toSessionInput);
      const unavailable = await app.http("put", `/sessions/${sessionId}/structure`, c.token.coachA).send({ exercises: [...current, { ...ex, exerciseId: c.exerciseB }] });
      expect(unavailable.status).toBe(400);
      const superset = await app.http("put", `/sessions/${sessionId}/structure`, c.token.coachA).send({ blocks: [{ type: "superset", name: "S", exercises: [ex] }] });
      expect(superset.status).toBe(400);
    });

    it("el atleta de la sesión y otro coach no pueden guardarla", async () => {
      for (const token of [c.token.athleteA, c.token.coachB]) {
        const res = await app.http("put", `/sessions/${sessionId}/structure`, token).send(sessionBody());
        expect([403, 404]).toContain(res.status);
      }
    });

    it("quitar un bloque deja sus ejercicios sueltos si no se reubican", async () => {
      const current = await read();
      const kept = current.sessionExercises.map(toSessionInput);
      const res = await app.http("put", `/sessions/${sessionId}/structure`, c.token.coachA).send({ exercises: kept });
      expect(res.status).toBe(200);
      expect(res.body.blocks).toEqual([]);
      expect(res.body.sessionExercises.every((e: { blockId: string | null }) => e.blockId === null)).toBe(true);
    });
  });
});

function toInput(e: { exerciseId: string; defaultSets: number; defaultReps: number; defaultWeight?: number | null; defaultRestSeconds?: number | null; defaultRir?: number | null; note?: string | null }) {
  return {
    exerciseId: e.exerciseId, defaultSets: e.defaultSets, defaultReps: e.defaultReps,
    ...(e.defaultWeight ? { defaultWeight: e.defaultWeight } : {}),
    ...(e.defaultRestSeconds ? { defaultRestSeconds: e.defaultRestSeconds } : {}),
    ...(e.defaultRir !== null && e.defaultRir !== undefined ? { defaultRir: e.defaultRir } : {}),
    ...(e.note ? { note: e.note } : {}),
  };
}

function toSessionInput(e: { id: string; exerciseId: string; targetSets: number; targetReps: number; targetWeight?: number | null; targetRestSeconds?: number | null; targetRir?: number | null; note?: string | null }) {
  return {
    id: e.id, exerciseId: e.exerciseId, targetSets: e.targetSets, targetReps: e.targetReps,
    ...(e.targetWeight ? { targetWeight: e.targetWeight } : {}),
    ...(e.targetRestSeconds ? { targetRestSeconds: e.targetRestSeconds } : {}),
    ...(e.targetRir !== null && e.targetRir !== undefined ? { targetRir: e.targetRir } : {}),
    ...(e.note ? { note: e.note } : {}),
  };
}
