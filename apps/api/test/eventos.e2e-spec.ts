import { PASSWORD, resetDatabase, startApp, passwordHash, type TestApp } from "./support/app";
import { seedScenario, type Scenario } from "./support/seed";
import { athleteEventsFixture } from "../../../packages/shared/src/fixtures/athleteEvents";
import { shapeDiff } from "../../../packages/shared/src/fixtures/resumen";

// Actividades paralelas del atleta (CYC-251): CRUD solo del atleta, repetición ya expandida,
// lectura del coach sin las notas, borrado con la cuenta y exportación de datos.

describe("Actividades paralelas del atleta (/me/events)", () => {
  let app: TestApp;
  let c: Scenario;
  const A = () => c.token.athleteA;
  const range = "from=2026-11-01&to=2026-11-30";
  const list = async (token: string) => (await app.http("get", `/me/events?${range}`, token)).body.events as Array<Record<string, unknown>>;
  const create = (token: string, body: Record<string, unknown>) => app.http("post", "/me/events", token).send(body);
  const volei = { type: "training", sport: "volleyball", title: "Voleibol", date: "2026-11-02", startTime: "19:00", durationMin: 90, intensity: "medium", notes: "Dolor de rodilla", repeat: { days: [0, 1], until: "2026-11-24" } };

  beforeAll(async () => {
    app = await startApp();
    await resetDatabase(app.prisma);
    c = await seedScenario(app);
  });
  afterAll(async () => {
    await app?.close();
  });

  it("sin actividades devuelve { events: [] }", async () => {
    const res = await app.http("get", `/me/events?${range}`, A());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ events: [] });
  });

  let seriesId = "";
  it("crea una serie y devuelve la serie; la lista sale YA expandida", async () => {
    const made = await create(A(), volei);
    expect(made.status).toBe(201);
    seriesId = made.body.id;
    expect(made.body).toMatchObject({ title: "Voleibol", sport: "volleyball", date: "2026-11-02", repeat: { days: [0, 1], until: "2026-11-24" } });
    const events = await list(A());
    expect(events.map((e) => e.date)).toEqual(["2026-11-02", "2026-11-03", "2026-11-09", "2026-11-10", "2026-11-16", "2026-11-17", "2026-11-23", "2026-11-24"]);
    expect(events.every((e) => e.seriesId === seriesId && e.isException === false)).toBe(true);
  });

  it("edita «solo esta ocurrencia»: el día queda con isException y los demás no cambian", async () => {
    const res = await app.http("patch", `/me/events/${seriesId}`, A()).send({ scope: "occurrence", occurrenceDate: "2026-11-03", startTime: "20:00", durationMin: 60, intensity: "low" });
    expect(res.status).toBe(200);
    expect(res.body.startTime).toBe("19:00"); // la serie no cambió
    const events = await list(A());
    const day = events.find((e) => e.date === "2026-11-03");
    expect(day).toMatchObject({ isException: true, startTime: "20:00", durationMin: 60, intensity: "low" });
    expect(events.find((e) => e.date === "2026-11-09")).toMatchObject({ isException: false, startTime: "19:00" });
  });

  it("borrar «solo esta ocurrencia» quita ese día; borrar dos veces da 404", async () => {
    expect((await app.http("delete", `/me/events/${seriesId}?scope=occurrence&date=2026-11-10`, A())).status).toBe(204);
    expect((await list(A())).map((e) => e.date)).not.toContain("2026-11-10");
    expect((await app.http("delete", `/me/events/${seriesId}?scope=occurrence&date=2026-11-10`, A())).status).toBe(404);
    expect((await app.http("delete", `/me/events/${seriesId}?scope=occurrence&date=2026-11-11`, A())).status).toBe(404); // no es un día de la serie
  });

  it("editar un día ya borrado da 404, y mover un día o cambiar la repetición con occurrence da 400", async () => {
    expect((await app.http("patch", `/me/events/${seriesId}`, A()).send({ scope: "occurrence", occurrenceDate: "2026-11-10", title: "x" })).status).toBe(404);
    expect((await app.http("patch", `/me/events/${seriesId}`, A()).send({ scope: "occurrence", occurrenceDate: "2026-11-09", date: "2026-11-10" })).status).toBe(400);
    expect((await app.http("patch", `/me/events/${seriesId}`, A()).send({ scope: "occurrence", occurrenceDate: "2026-11-09", repeat: null })).status).toBe(400);
  });

  it("edita «toda la serie»: cambia las ocurrencias normales y conserva las excepciones", async () => {
    const res = await app.http("patch", `/me/events/${seriesId}`, A()).send({ scope: "series", title: "Vóley playa", repeat: { days: [0, 1], until: "2026-11-17" } });
    expect(res.status).toBe(200);
    const events = await list(A());
    expect(events.map((e) => e.date)).toEqual(["2026-11-02", "2026-11-03", "2026-11-09", "2026-11-16", "2026-11-17"]);
    expect(events.find((e) => e.date === "2026-11-09")).toMatchObject({ title: "Vóley playa" });
    expect(events.find((e) => e.date === "2026-11-03")).toMatchObject({ isException: true, startTime: "20:00" });
  });

  it("una actividad suelta (sin repetición) se edita y se borra como una sola", async () => {
    const liga = await create(A(), { type: "match", title: "Partido de liga", date: "2026-11-07", allDay: true, intensity: "high" });
    expect(liga.status).toBe(201);
    expect((await app.http("patch", `/me/events/${liga.body.id}`, A()).send({ scope: "occurrence", occurrenceDate: "2026-11-07", title: "Final de liga" })).status).toBe(200);
    expect((await list(A())).find((e) => e.seriesId === liga.body.id)).toMatchObject({ title: "Final de liga", allDay: true, startTime: null, durationMin: null });
    expect((await app.http("delete", `/me/events/${liga.body.id}?scope=occurrence&date=2026-11-07`, A())).status).toBe(204);
    expect((await list(A())).some((e) => e.seriesId === liga.body.id)).toBe(false);
  });

  it("los de todo el día salen primero dentro de su día", async () => {
    await create(A(), { type: "match", title: "Torneo", date: "2026-11-09", allDay: true });
    const day = (await list(A())).filter((e) => e.date === "2026-11-09");
    expect(day.map((e) => e.title)).toEqual(["Torneo", "Vóley playa"]);
  });

  it("el atleta ve y crea sin ciclo activo ni coach vinculado", async () => {
    const lone = await app.prisma.user.create({ data: { email: "sola@e2e.test", name: "Sola", role: "athlete", passwordHash: await passwordHash(), emailVerifiedAt: new Date() } });
    const login = await app.http("post", "/auth/login").send({ email: lone.email, password: PASSWORD });
    const token = login.body.accessToken as string;
    expect((await create(token, { type: "training", sport: "running", title: "Correr", date: "2026-11-05" })).status).toBe(201);
    expect((await list(token)).map((e) => e.title)).toEqual(["Correr"]);
  });

  it("cada atleta ve y toca solo lo suyo", async () => {
    expect((await list(c.token.athleteB)).some((e) => e.seriesId === seriesId)).toBe(false);
    expect((await app.http("patch", `/me/events/${seriesId}`, c.token.athleteB).send({ scope: "series", title: "Robado" })).status).toBe(404);
    expect((await app.http("delete", `/me/events/${seriesId}?scope=series`, c.token.athleteB)).status).toBe(404);
    expect((await list(A())).some((e) => e.seriesId === seriesId)).toBe(true);
  });

  it("el coach vinculado lee las de su atleta, SIN las notas; otro coach o una relación terminada, no", async () => {
    const own = await app.http("get", `/athletes/${c.userId.athleteA}/events?${range}`, c.token.coachA);
    expect(own.status).toBe(200);
    expect(own.body.events.length).toBeGreaterThan(0);
    expect(JSON.stringify(own.body)).not.toContain("Dolor de rodilla");
    expect(own.body.events.every((e: { notes: unknown }) => e.notes === null)).toBe(true);
    expect(own.body.events.find((e: { sport: unknown }) => e.sport === "volleyball")).toBeTruthy();
    // el atleta sí ve sus notas
    expect((await list(A())).some((e) => e.notes === "Dolor de rodilla")).toBe(true);
    expect([403, 404]).toContain((await app.http("get", `/athletes/${c.userId.athleteA}/events?${range}`, c.token.coachB)).status);
    expect((await app.http("get", `/athletes/${c.userId.athleteC}/events?${range}`, c.token.coachA)).status).toBe(403);
  });

  it("el coach no puede crear, editar ni borrar", async () => {
    expect((await create(c.token.coachA, volei)).status).toBe(403);
    expect((await app.http("patch", `/me/events/${seriesId}`, c.token.coachA).send({ scope: "series", title: "x" })).status).toBe(403);
    expect((await app.http("delete", `/me/events/${seriesId}?scope=series`, c.token.coachA)).status).toBe(403);
  });

  it("rango: máximo 92 días y fechas válidas", async () => {
    expect((await app.http("get", "/me/events?from=2026-11-01&to=2027-02-28", A())).status).toBe(400);
    expect((await app.http("get", "/me/events?from=2026-11-10&to=2026-11-01", A())).status).toBe(400);
    expect((await app.http("get", "/me/events", A())).status).toBe(400);
  });

  it("tiene la forma del ejemplo compartido (contrato con la app y la web)", async () => {
    const mine = await app.http("get", `/me/events?${range}`, A());
    expect(shapeDiff(mine.body, athleteEventsFixture)).toEqual([]);
    const coach = await app.http("get", `/athletes/${c.userId.athleteA}/events?${range}`, c.token.coachA);
    expect(shapeDiff(coach.body, athleteEventsFixture)).toEqual([]);
    const made = await create(A(), volei);
    const { seriesId: _s, date: _d, isException: _i, ...fixtureSeries } = athleteEventsFixture.events[0];
    expect(shapeDiff(made.body, { id: "x", date: "2026-11-02", ...fixtureSeries })).toEqual([]);
  });

  it("tope de actividades por atleta", async () => {
    const other = await app.prisma.user.create({ data: { email: "tope@e2e.test", name: "Tope", role: "athlete", passwordHash: await passwordHash(), emailVerifiedAt: new Date() } });
    const login = await app.http("post", "/auth/login").send({ email: other.email, password: PASSWORD });
    await app.prisma.athleteEvent.createMany({ data: Array.from({ length: 200 }, (_, i) => ({ athleteId: other.id, type: "other" as const, title: `E${i}`, date: new Date(Date.UTC(2026, 10, 1)), repeatDays: [] })) });
    expect((await create(login.body.accessToken, { type: "other", title: "una más", date: "2026-11-05" })).status).toBe(400);
  });

  it("va en la exportación de datos del atleta, con sus notas, y se borra con la cuenta", async () => {
    const lone = await app.prisma.user.create({ data: { email: "adios@e2e.test", name: "Adiós", role: "athlete", passwordHash: await passwordHash(), emailVerifiedAt: new Date() } });
    const login = await app.http("post", "/auth/login").send({ email: lone.email, password: PASSWORD });
    const token = login.body.accessToken as string;
    const made = await create(token, { ...volei, title: "Para exportar" });
    await app.http("delete", `/me/events/${made.body.id}?scope=occurrence&date=2026-11-03`, token);
    const data = await app.http("get", "/users/me/export", token);
    expect(data.status).toBe(200);
    expect(data.body.athleteEvents).toHaveLength(1);
    expect(data.body.athleteEvents[0]).toMatchObject({ title: "Para exportar", notes: "Dolor de rodilla" });
    expect(data.body.athleteEvents[0].exceptions).toHaveLength(1);
    expect((await app.http("delete", "/users/me", token).send({ confirmation: "ELIMINAR" })).status).toBe(204);
    expect(await app.prisma.athleteEvent.count({ where: { athleteId: lone.id } })).toBe(0);
    expect(await app.prisma.athleteEventException.count({ where: { eventId: made.body.id } })).toBe(0);
  });
});
