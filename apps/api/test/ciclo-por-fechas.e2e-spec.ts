import { resetDatabase, startApp, type TestApp } from "./support/app";
import { seedScenario, type Scenario } from "./support/seed";

// Nuevo ciclo por calendario (CYC-314): solo nombre y fechas; el inicio no es anterior a hoy.

describe("Ciclo por fechas", () => {
  let app: TestApp;
  let c: Scenario;
  const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
  const body = (extra: object = {}) => ({ athleteId: c.userId.athleteA, name: "Por fechas", startDate: day(0), endDate: day(27), today: day(0), ...extra });
  const create = (extra: object = {}) => app.http("post", "/cycles", c.token.coachA).send(body(extra));

  beforeAll(async () => {
    app = await startApp();
    await resetDatabase(app.prisma);
    c = await seedScenario(app);
  });
  afterAll(async () => {
    await app?.close();
  });

  it("crea solo con nombre y fechas: queda sin sesiones por semana", async () => {
    const res = await create();
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ cycleType: "mesocycle", sessionsPerWeek: null });
  });

  it("sigue aceptando el cuerpo de la web antigua", async () => {
    const res = await create({ cycleType: "microcycle", sessionsPerWeek: 3, today: undefined });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ cycleType: "microcycle", sessionsPerWeek: 3 });
  });

  it("rechaza inicio pasado, ciclos de un día, macrociclos y un «hoy» inventado", async () => {
    expect((await create({ startDate: day(-1) })).body.message).toContain("antes de hoy");
    expect((await create({ endDate: day(0) })).status).toBe(400);
    expect((await create({ cycleType: "macrocycle" })).status).toBe(400);
    expect((await create({ startDate: day(-10), today: day(-10) })).status).toBe(400);
  });

  it("las plantillas solo piden nombre y semanas, y asignarlas también valida el inicio", async () => {
    const tpl = await app.http("post", "/cycles/templates", c.token.coachA).send({ name: "Base", weeks: 4 });
    expect(tpl.status).toBe(201);
    expect(tpl.body).toMatchObject({ sessionsPerWeek: null, templateWeeks: 4 });
    const assign = (startDate: string) => app.http("post", `/cycles/${tpl.body.id}/assign`, c.token.coachA).send({ athleteId: c.userId.athleteA, startDate, today: day(0) });
    expect((await assign(day(-1))).status).toBe(400);
    const ok = await assign(day(0));
    expect(ok.status).toBe(201);
    expect(ok.body.sessionsPerWeek).toBeNull();
  });

  it("varias sesiones el mismo día, y mover el inicio recalcula las semanas sin perder ninguna", async () => {
    const cycle = (await create({ startDate: day(1), endDate: day(30) })).body;
    const add = () => app.http("post", `/cycles/${cycle.id}/sessions`, c.token.coachA).send({ routineId: c.routineA, scheduledDate: day(9), today: day(0) });
    expect((await add()).status).toBe(201);
    expect((await add()).status).toBe(201);
    const rows = () => app.prisma.trainingSession.findMany({ where: { cycleId: cycle.id }, orderBy: { slotNumber: "asc" }, select: { weekNumber: true, slotNumber: true } });
    expect(await rows()).toEqual([{ weekNumber: 2, slotNumber: 1 }, { weekNumber: 2, slotNumber: 2 }]);

    const moved = await app.http("patch", `/cycles/${cycle.id}`, c.token.coachA).send({ startDate: day(5), today: day(0) });
    expect(moved.status).toBe(200);
    expect(await rows()).toEqual([{ weekNumber: 1, slotNumber: 1 }, { weekNumber: 1, slotNumber: 2 }]);

    // Dejar sesiones fuera se sigue bloqueando.
    expect((await app.http("patch", `/cycles/${cycle.id}`, c.token.coachA).send({ startDate: day(10), today: day(0) })).status).toBe(409);
    expect((await app.http("patch", `/cycles/${cycle.id}`, c.token.coachA).send({ endDate: day(8) })).status).toBe(409);
    expect(await rows()).toHaveLength(2);
  });

  it("un ciclo que ya empezó se edita, pero no se mueve a otro día pasado", async () => {
    const edit = (data: object) => app.http("patch", `/cycles/${c.cycleA}`, c.token.coachA).send({ today: day(0), ...data });
    expect((await edit({ name: "Renombrado" })).status).toBe(200);
    expect((await edit({ startDate: day(-3) })).status).toBe(400);
  });
});
