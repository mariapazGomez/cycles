import { resetDatabase, startApp, type TestApp } from "./support/app";
import { seedScenario, type Scenario } from "./support/seed";
import { sessionWorkBlockFixture } from "../../../packages/shared/src/fixtures/workBlocks";
import { shapeDiff } from "../../../packages/shared/src/fixtures/resumen";

// Bloques de trabajo (CYC-271, fase 1a): la rutina los tiene, la sesión los copia al
// asignarla, se ven en las lecturas y borrar un bloque no borra sus ejercicios.
// Los endpoints para editarlos llegan en la fase 1b: aquí los bloques se siembran
// directo en la base.

const inTenDays = () => new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);

describe("Bloques de trabajo (lectura y copia)", () => {
  let app: TestApp;
  let c: Scenario;
  let routineId: string;
  let calId: string;
  let sessionId: string;

  beforeAll(async () => {
    app = await startApp();
    await resetDatabase(app.prisma);
    c = await seedScenario(app);

    const routine = await app.http("post", "/routines", c.token.coachA).send({
      name: "Con bloques",
      exercises: [
        { exerciseId: c.globalExercise, defaultSets: 3, defaultReps: 8 },
        { exerciseId: c.globalExercise, defaultSets: 2, defaultReps: 10 },
        { exerciseId: c.globalExercise, defaultSets: 1, defaultReps: 5 },
      ],
    });
    expect(routine.status).toBe(201);
    routineId = routine.body.id;
    // Una rutina antigua no trae bloques.
    expect(routine.body.blocks).toEqual([]);

    const cal = await app.prisma.routineBlock.create({ data: { routineId, name: "Calentamiento", type: "warmup", orderIndex: 1, note: "Sin prisa" } });
    const fuerza = await app.prisma.routineBlock.create({ data: { routineId, name: "Piernas", type: "custom", color: "#8a63d2", orderIndex: 2 } });
    calId = cal.id;
    const [a, b] = routine.body.routineExercises;
    await app.prisma.routineExercise.update({ where: { id: a.id }, data: { blockId: cal.id } });
    await app.prisma.routineExercise.update({ where: { id: b.id }, data: { blockId: fuerza.id } });
    // El tercero queda sin bloque.

    const session = await app.http("post", `/cycles/${c.cycleA}/sessions`, c.token.coachA).send({ routineId, weekNumber: 3, slotNumber: 1 });
    expect(session.status).toBe(201);
    sessionId = session.body.id;
  });
  afterAll(async () => {
    await app?.close();
  });

  it("GET /routines/:id trae sus bloques en orden y cada ejercicio su blockId", async () => {
    const res = await app.http("get", `/routines/${routineId}`, c.token.coachA);
    expect(res.status).toBe(200);
    expect(res.body.blocks.map((b: { name: string }) => b.name)).toEqual(["Calentamiento", "Piernas"]);
    expect(res.body.routineExercises.map((e: { blockId: string | null }) => e.blockId === null)).toEqual([false, false, true]);
  });

  it("al asignar la rutina, la sesión copia los bloques con ids nuevos y reubica los ejercicios", async () => {
    const res = await app.http("get", `/sessions/${sessionId}`, c.token.coachA);
    expect(res.status).toBe(200);
    expect(res.body.blocks.map((b: { name: string; type: string; color: string | null }) => [b.name, b.type, b.color])).toEqual([
      ["Calentamiento", "warmup", null],
      ["Piernas", "custom", "#8a63d2"],
    ]);
    expect(res.body.blocks.every((b: { id: string }) => b.id !== calId)).toBe(true);
    const byBlock = res.body.sessionExercises.map((e: { blockId: string | null }) => e.blockId);
    expect(byBlock[0]).toBe(res.body.blocks[0].id);
    expect(byBlock[1]).toBe(res.body.blocks[1].id);
    expect(byBlock[2]).toBeNull();
  });

  it("el atleta de la sesión ve los bloques; otro coach y otro atleta no ven la sesión", async () => {
    const own = await app.http("get", `/sessions/${sessionId}`, c.token.athleteA);
    expect(own.status).toBe(200);
    expect(own.body.blocks).toHaveLength(2);
    for (const token of [c.token.coachB, c.token.athleteB]) {
      const res = await app.http("get", `/sessions/${sessionId}`, token);
      expect([403, 404]).toContain(res.status);
    }
    const routineOther = await app.http("get", `/routines/${routineId}`, c.token.coachB);
    expect([403, 404]).toContain(routineOther.status);
  });

  it("la forma de un bloque de sesión coincide con el contrato de @cycles/shared", async () => {
    const res = await app.http("get", `/sessions/${sessionId}`, c.token.coachA);
    expect(shapeDiff(res.body.blocks, [sessionWorkBlockFixture])).toEqual([]);
  });

  it("duplicar la sesión copia también los bloques", async () => {
    const copy = await app.http("post", `/sessions/${sessionId}/duplicate`, c.token.coachA).send({ scheduledDate: inTenDays() });
    expect(copy.status).toBeLessThan(300);
    const res = await app.http("get", `/sessions/${copy.body.id}`, c.token.coachA);
    expect(res.body.blocks.map((b: { name: string }) => b.name)).toEqual(["Calentamiento", "Piernas"]);
    const original = await app.http("get", `/sessions/${sessionId}`, c.token.coachA);
    const ids = new Set(original.body.blocks.map((b: { id: string }) => b.id));
    expect(res.body.blocks.every((b: { id: string }) => !ids.has(b.id))).toBe(true);
    expect(res.body.sessionExercises[0].blockId).toBe(res.body.blocks[0].id);
  });

  it("borrar un bloque deja sus ejercicios sin bloque, no los borra", async () => {
    const before = await app.prisma.sessionExercise.count({ where: { sessionId } });
    const block = await app.prisma.sessionBlock.findFirstOrThrow({ where: { sessionId, name: "Calentamiento" } });
    await app.prisma.sessionBlock.delete({ where: { id: block.id } });
    expect(await app.prisma.sessionExercise.count({ where: { sessionId } })).toBe(before);
    expect(await app.prisma.sessionExercise.count({ where: { sessionId, blockId: block.id } })).toBe(0);
  });

  it("eliminar la rutina borra también sus bloques", async () => {
    const res = await app.http("delete", `/routines/${routineId}`, c.token.coachA);
    expect(res.status).toBeLessThan(300);
    expect(await app.prisma.routineBlock.count({ where: { routineId } })).toBe(0);
  });

  it("la exportación incluye los bloques y el borrado de cuenta los elimina (atleta y coach)", async () => {
    // Una sesión nueva con bloques (la de arriba perdió la rutina y un bloque).
    const routine = await app.http("post", "/routines", c.token.coachA).send({
      name: "Para borrar",
      exercises: [{ exerciseId: c.globalExercise, defaultSets: 1, defaultReps: 5 }],
    });
    const block = await app.prisma.routineBlock.create({ data: { routineId: routine.body.id, name: "Cardio", type: "cardio", orderIndex: 1 } });
    await app.prisma.routineExercise.updateMany({ where: { routineId: routine.body.id }, data: { blockId: block.id } });
    const made = await app.http("post", `/cycles/${c.cycleA}/sessions`, c.token.coachA).send({ routineId: routine.body.id, weekNumber: 4, slotNumber: 1 });
    expect(made.status).toBe(201);

    const coachData = await app.http("get", "/users/me/export", c.token.coachA);
    expect(coachData.body.routines.find((r: { id: string }) => r.id === routine.body.id).blocks).toHaveLength(1);
    expect(coachData.body.plans.flatMap((p: { sessions: { blocks: unknown[] }[] }) => p.sessions).some((x: { blocks: unknown[] }) => x.blocks.length > 0)).toBe(true);

    const athleteData = await app.http("get", "/users/me/export", c.token.athleteA);
    expect(athleteData.body.plans.flatMap((p: { sessions: { blocks: unknown[] }[] }) => p.sessions).some((x: { blocks: unknown[] }) => x.blocks.length > 0)).toBe(true);

    expect((await app.http("delete", "/users/me", c.token.athleteA).send({ confirmation: "ELIMINAR" })).status).toBe(204);
    expect(await app.prisma.sessionBlock.count({ where: { session: { cycle: { athleteId: c.userId.athleteA } } } })).toBe(0);
    expect((await app.http("delete", "/users/me", c.token.coachA).send({ confirmation: "ELIMINAR" })).status).toBe(204);
    expect(await app.prisma.routineBlock.count({ where: { routine: { coachId: c.userId.coachA } } })).toBe(0);
  });
});
