import { resetDatabase, startApp, type TestApp } from "./support/app";
import { seedScenario, type Scenario } from "./support/seed";

// «Hoy» con dos ciclos a la vez (CYC-314): GET /me/today/cycles trae una entrada por ciclo activo
// y GET /me/today no cambia.
const DAY = 86_400_000;
const day = (offset: number) => new Date(Date.now() + offset * DAY).toISOString().slice(0, 10);
const midnight = (offset: number) => new Date(`${day(offset)}T00:00:00.000Z`);

describe("GET /me/today/cycles", () => {
  let app: TestApp;
  let c: Scenario;
  let second: string;
  let secondSession: string;

  beforeAll(async () => {
    app = await startApp();
    await resetDatabase(app.prisma);
    c = await seedScenario(app);
    await app.prisma.trainingSession.update({ where: { id: c.sA }, data: { scheduledDate: midnight(0) } });
    // Un segundo ciclo que empezó después, con su sesión dentro de dos días.
    const cycle = await app.prisma.trainingCycle.create({
      data: { coachId: c.userId.coachA, athleteId: c.userId.athleteA, name: "Hombro", cycleType: "mesocycle", startDate: midnight(-1), endDate: midnight(20) },
    });
    second = cycle.id;
    secondSession = (
      await app.prisma.trainingSession.create({ data: { cycleId: second, name: "Movilidad", weekNumber: 1, slotNumber: 1, scheduledDate: midnight(2) } })
    ).id;
  });
  afterAll(async () => {
    await app?.close();
  });

  const cycles = (query = `?date=${day(0)}`, token = c.token.athleteA) => app.http("get", `/me/today/cycles${query}`, token);

  it("sin sesión 401; el coach 403; fecha mala 400", async () => {
    expect((await app.http("get", "/me/today/cycles")).status).toBe(401);
    expect((await cycles("", c.token.coachA)).status).toBe(403);
    expect((await cycles("?date=2026-02-31")).status).toBe(400);
    expect((await cycles("?since=ayer")).status).toBe(400);
  });

  it("trae los dos: primero el que tiene algo hoy; el otro, su próxima", async () => {
    const res = await cycles();
    expect(res.status).toBe(200);
    expect(res.body.cycles.map((e: any) => [e.cycle.id, e.upcoming, e.pending.map((s: any) => s.id)])).toEqual([
      [c.cycleA, false, [c.sA]],
      [second, true, [secondSession]],
    ]);
    expect(res.body.cycles[0].pending[0].sessionExercises[0].exercise.name).toBeDefined();
    expect(res.body.cycles[0].pending[0].blocks).toEqual([]);
  });

  it("solo lo propio", async () => {
    const res = await cycles(undefined, c.token.athleteB);
    expect(res.body.cycles.map((e: any) => e.cycle.id)).toEqual([c.cycleB]);
  });

  it("si las dos son de hoy, primero la del ciclo que empezó antes", async () => {
    await app.prisma.trainingSession.update({ where: { id: secondSession }, data: { scheduledDate: midnight(0) } });
    const res = await cycles();
    expect(res.body.cycles.map((e: any) => [e.cycle.id, e.upcoming])).toEqual([
      [c.cycleA, false],
      [second, false],
    ]);
  });

  it("la hecha hoy queda en su ciclo y el que tiene algo por hacer pasa arriba; /me/today no cambia", async () => {
    const closed = await app.http("post", `/sessions/${c.sA}/feedback`, c.token.athleteA).send({ outcome: "completed", srpe: 5, durationMinutes: 40 });
    expect(closed.status).toBe(201);
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const res = await cycles(`?date=${day(0)}&since=${since}`);
    expect(res.body.cycles.map((e: any) => [e.cycle.id, e.pending.length, e.done.map((s: any) => s.id)])).toEqual([
      [second, 1, []],
      [c.cycleA, 0, [c.sA]],
    ]);
    // Cerrada antes de que empezara el día del atleta: ya no es «hecha hoy».
    const later = await cycles(`?date=${day(0)}&since=${new Date(Date.now() + 60_000).toISOString()}`);
    expect(later.body.cycles.map((e: any) => e.cycle.id)).toEqual([second]);

    const legacy = await app.http("get", `/me/today?date=${day(0)}`, c.token.athleteA);
    expect(Object.keys(legacy.body).sort()).toEqual(["assignedToday", "cycle", "session"]);
    expect(legacy.body.session.id).toBe(secondSession);
  });
});
