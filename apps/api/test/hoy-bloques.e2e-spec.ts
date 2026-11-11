import { resetDatabase, startApp, type TestApp } from "./support/app";
import { seedScenario, type Scenario } from "./support/seed";
import { todaySessionFixture } from "../../../packages/shared/src/fixtures/todaySession";
import { shapeDiff } from "../../../packages/shared/src/fixtures/resumen";

// GET /me/today trae los bloques de la sesión (CYC-272): en orden, solo los de esa sesión,
// y cada ejercicio con su blockId (nulo si va suelto, aun si la sesión tiene bloques).

describe("GET /me/today con bloques", () => {
  let app: TestApp;
  let c: Scenario;
  let mixedId: string;

  beforeAll(async () => {
    app = await startApp();
    await resetDatabase(app.prisma);
    c = await seedScenario(app);

    // Sesión mixta: dos bloques (el segundo se crea primero para probar el orden) y un ejercicio suelto.
    const made = await app.prisma.trainingSession.create({ data: { cycleId: c.cycleA, name: "Mixta", weekNumber: 5, slotNumber: 1, status: "pending" } });
    mixedId = made.id;
    const fuerza = await app.prisma.sessionBlock.create({ data: { sessionId: mixedId, name: "Fuerza", type: "strength", orderIndex: 2 } });
    const cal = await app.prisma.sessionBlock.create({ data: { sessionId: mixedId, name: "Calentamiento", type: "warmup", orderIndex: 1 } });
    const ex = (orderIndex: number, blockId: string | null) =>
      app.prisma.sessionExercise.create({ data: { sessionId: mixedId, exerciseId: c.globalExercise, orderIndex, targetSets: 3, targetReps: 8, blockId } });
    await ex(1, cal.id);
    await ex(2, fuerza.id);
    await ex(3, null);
  });
  afterAll(async () => {
    await app?.close();
  });

  const today = (query = "") => app.http("get", `/me/today${query}`, c.token.athleteA);

  it("una sesión con bloques y un ejercicio suelto devuelve ambos, en orden", async () => {
    const res = await today(`?sessionId=${mixedId}`);
    expect(res.status).toBe(200);
    expect(res.body.session.blocks.map((b: { name: string }) => b.name)).toEqual(["Calentamiento", "Fuerza"]);
    const ids = res.body.session.blocks.map((b: { id: string }) => b.id);
    const byBlock = res.body.session.sessionExercises.map((e: { blockId: string | null }) => e.blockId);
    expect(byBlock).toEqual([ids[0], ids[1], null]);
  });

  it("solo trae los bloques de esa sesión", async () => {
    const other = await app.prisma.sessionBlock.create({ data: { sessionId: c.sA, name: "De otra", type: "cardio", orderIndex: 1 } });
    const res = await today(`?sessionId=${mixedId}`);
    expect(res.body.session.blocks.some((b: { id: string }) => b.id === other.id)).toBe(false);
    const own = await today(`?sessionId=${c.sA}`);
    expect(own.body.session.blocks.map((b: { id: string }) => b.id)).toEqual([other.id]);
    await app.prisma.sessionBlock.delete({ where: { id: other.id } });
  });

  it("una sesión sin bloques sigue igual: blocks vacío y todos los ejercicios con blockId nulo", async () => {
    const res = await today(`?sessionId=${c.sA}`);
    expect(res.status).toBe(200);
    expect(res.body.session.blocks).toEqual([]);
    expect(res.body.session.sessionExercises.every((e: { blockId: string | null }) => e.blockId === null)).toBe(true);
  });

  it("sin sessionId (la próxima pendiente) también trae blocks", async () => {
    const res = await today();
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.session.blocks)).toBe(true);
  });

  it("la forma coincide con el contrato de @cycles/shared", async () => {
    const res = await today(`?sessionId=${mixedId}`);
    expect(shapeDiff(res.body.session.blocks, todaySessionFixture.session.blocks)).toEqual([]);
    // Cada ejercicio lleva su blockId (id del bloque o nulo), como en el fixture.
    for (const e of res.body.session.sessionExercises) expect("blockId" in e).toBe(true);
    expect(todaySessionFixture.session.sessionExercises.map((e) => e.blockId === null)).toEqual([false, true]);
  });
});
