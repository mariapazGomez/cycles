import { resetDatabase, startApp, type TestApp } from "./support/app";
import { seedScenario, type Scenario } from "./support/seed";
import { athleteSummaryFixture, cycleProgressFixture, shapeDiff, summaryLayoutFixture } from "../../../packages/shared/src/fixtures/resumen";

// Contrato API ↔ web de la pizarra del Resumen (CYC-240): la respuesta REAL de
// cada endpoint tiene la misma forma que el ejemplo de @cycles/shared, que es el
// que usa la web. Si la API cambia una respuesta, esto falla antes que la pantalla.

describe("Contrato del Resumen (API ↔ web)", () => {
  let app: TestApp;
  let c: Scenario;

  beforeAll(async () => {
    app = await startApp();
    await resetDatabase(app.prisma);
    c = await seedScenario(app);
    // Datos reales para que las listas no vengan vacías: peso y RIR planificados, series y un cierre.
    await app.prisma.sessionExercise.update({ where: { id: c.seA }, data: { targetWeight: 80, targetRir: 2 } });
    await app.prisma.exerciseLog.createMany({
      data: [
        { sessionExerciseId: c.seA, athleteId: c.userId.athleteA, setNumber: 1, actualReps: 8, actualWeight: 80, rir: 2 },
        { sessionExerciseId: c.seA, athleteId: c.userId.athleteA, setNumber: 2, actualReps: 7, actualWeight: 80, rir: 1 },
      ],
    });
    await app.prisma.sessionFeedback.create({ data: { sessionId: c.sA, athleteId: c.userId.athleteA, outcome: "completed", srpe: 7, durationMinutes: 60, pain: false } });
    await app.prisma.trainingSession.update({ where: { id: c.sA }, data: { status: "completed" } });
  });
  afterAll(async () => {
    await app?.close();
  });

  it("GET /athletes/:id/summary tiene la forma de AthleteSummary", async () => {
    const res = await app.http("get", `/athletes/${c.userId.athleteA}/summary?weeks=6`, c.token.coachA);
    expect(res.status).toBe(200);
    expect(res.body.exercises.length).toBeGreaterThan(0);
    expect(shapeDiff(res.body, athleteSummaryFixture)).toEqual([]);
  });

  it("GET /cycles/:id/progress tiene la forma de CycleProgress", async () => {
    const res = await app.http("get", `/cycles/${c.cycleA}/progress`, c.token.coachA);
    expect(res.status).toBe(200);
    const done = res.body.sessions.find((s: { status: string }) => s.status === "completed");
    expect(done.feedback).not.toBeNull();
    expect(done.exercises[0].actual.sets.length).toBeGreaterThan(0);
    expect(shapeDiff(res.body, cycleProgressFixture)).toEqual([]);
  });

  it("GET y PUT /coach/summary-layout tienen la forma de SummaryLayout", async () => {
    const first = await app.http("get", "/coach/summary-layout", c.token.coachA);
    expect(first.status).toBe(200);
    expect(shapeDiff(first.body, summaryLayoutFixture)).toEqual([]);
    const put = await app.http("put", "/coach/summary-layout", c.token.coachA).send({ charts: summaryLayoutFixture.charts });
    expect(put.status).toBe(200);
    expect(shapeDiff(put.body, summaryLayoutFixture)).toEqual([]);
    expect(put.body.charts).toEqual(summaryLayoutFixture.charts);
  });

  it("el detector de forma sí detecta una respuesta distinta (la lección de CYC-249)", () => {
    expect(shapeDiff([{ id: "1" }], { exercises: [{ id: "1" }] })).not.toEqual([]);
    expect(shapeDiff({ exercises: [] }, [{ id: "1" }])).not.toEqual([]);
    expect(shapeDiff({ a: 1, extra: 2 }, { a: 1 })).toEqual(["$.extra: sobra"]);
    expect(shapeDiff({ a: "x" }, { a: 1 })).toEqual(["$.a: se esperaba number y llegó string"]);
  });
});
