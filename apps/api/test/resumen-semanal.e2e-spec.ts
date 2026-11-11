import { weeklySummaryEmptyFixture, weeklySummaryFixture } from "../../../packages/shared/src/fixtures/weeklySummary";
import { shapeDiff } from "../../../packages/shared/src/fixtures/resumen";
import { resetDatabase, startApp, type TestApp } from "./support/app";
import { seedScenario, type Scenario } from "./support/seed";

// Resumen semanal del atleta para Hoy (CYC-261): GET /me/weekly-summary.

describe("Resumen semanal (GET /me/weekly-summary)", () => {
  let app: TestApp;
  let c: Scenario;
  const weekly = (token: string, day?: string) => app.http("get", `/me/weekly-summary${day ? `?weekStart=${day}` : ""}`, token);

  beforeAll(async () => {
    app = await startApp();
    await resetDatabase(app.prisma);
    c = await seedScenario(app);
    // Ciclo propio de athleteA que empieza el lunes 9 de noviembre de 2026, con tres sesiones en
    // la semana 1 (dos hechas y una pendiente) y una en la semana 2.
    const cycle = await app.prisma.trainingCycle.create({
      data: { coachId: c.userId.coachA, athleteId: c.userId.athleteA, name: "Semanal", startDate: new Date(Date.UTC(2026, 10, 9)), endDate: new Date(Date.UTC(2026, 11, 6)), cycleType: "mesocycle", sessionsPerWeek: 3 },
    });
    const mk = (slot: number, weekNumber: number, status: "pending" | "completed") =>
      app.prisma.trainingSession.create({ data: { cycleId: cycle.id, name: `S${weekNumber}.${slot}`, weekNumber, slotNumber: slot, status } });
    const [s1, s2] = [await mk(1, 1, "completed"), await mk(2, 1, "completed")];
    await mk(3, 1, "pending");
    await mk(1, 2, "pending");
    const close = (sessionId: string, srpe: number, durationMinutes: number, note?: string) =>
      app.prisma.sessionFeedback.create({ data: { sessionId, athleteId: c.userId.athleteA, outcome: "completed", srpe, durationMinutes, notes: note } });
    await close(s1.id, 6, 50, "me dolió la rodilla");
    await close(s2.id, 7, 45);
  });
  afterAll(async () => {
    await app?.close();
  });

  it("devuelve las sesiones hechas y planeadas, el tiempo y el esfuerzo medio de la semana", async () => {
    const res = await weekly(c.token.athleteA, "2026-11-11");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(weeklySummaryFixture);
  });

  it("la forma de la respuesta es la del fixture que usa la app", async () => {
    expect(shapeDiff((await weekly(c.token.athleteA, "2026-11-09")).body, weeklySummaryFixture)).toEqual([]);
  });

  it("una semana fuera del ciclo da ceros y null, no un error", async () => {
    const res = await weekly(c.token.athleteA, "2027-03-01");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ sessionsPlanned: 0, sessionsDone: 0, minutesTrained: null, averageSrpe: null });
    expect(shapeDiff(res.body, weeklySummaryEmptyFixture)).toEqual([]);
  });

  it("sin fecha devuelve la semana de hoy; con ciclo ya terminado o sin ciclo, vacía", async () => {
    const res = await weekly(c.token.athleteB);
    expect(res.status).toBe(200);
    expect(res.body.sessionsDone).toBe(0);
  });

  it("no incluye notas ni datos de salud", async () => {
    const text = JSON.stringify((await weekly(c.token.athleteA, "2026-11-09")).body);
    expect(text).not.toContain("rodilla");
    expect(text).not.toContain("pain");
  });

  it("cada atleta ve solo lo suyo", async () => {
    const res = await weekly(c.token.athleteB, "2026-11-09");
    expect(res.body).toMatchObject({ sessionsPlanned: 0, sessionsDone: 0 });
  });

  it.each(["2026-13-40", "mañana", "2026-11-9"])("una fecha mal escrita (%s) da 400", async (day) => {
    expect((await weekly(c.token.athleteA, day)).status).toBe(400);
  });

  it("sin sesión da 401 y un coach no entra (403)", async () => {
    expect((await app.http("get", "/me/weekly-summary")).status).toBe(401);
    expect((await weekly(c.token.coachA)).status).toBe(403);
  });
});
