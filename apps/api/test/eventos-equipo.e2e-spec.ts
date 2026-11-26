import { teamEventsFixture } from "../../../packages/shared/src/fixtures/teamEvents";
import { passwordHash, resetDatabase, startApp, type TestApp } from "./support/app";
import { seedScenario, type Scenario } from "./support/seed";

// Eventos, calendario y ranking del equipo (CYC-317): permisos, series, lo que ve el atleta y R7.

describe("Eventos del equipo", () => {
  let app: TestApp;
  let c: Scenario;
  let teamId: string;
  let second: string;
  let pending: string;
  const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
  const weekday = (iso: string) => (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7;
  const coach = () => c.token.coachA;
  const range = () => `from=${day(-7)}&to=${day(30)}`;
  const create = (body: object, token = coach()) => app.http("post", `/teams/${teamId}/events`, token).send(body);
  const match = (over: object = {}) => ({ type: "match", title: "Partido de liga", date: day(3), startTime: "10:00", durationMin: 120, notes: "Llegar antes.", ...over });
  const mine = async (token: string) => (await app.http("get", `/me/team-events?${range()}`, token)).body.events;

  beforeAll(async () => {
    app = await startApp();
    await resetDatabase(app.prisma);
    c = await seedScenario(app);
    const mk = async (email: string, name: string, status: "active" | "pending") => {
      const user = await app.prisma.user.create({ data: { email, name, role: "athlete", passwordHash: await passwordHash(), emailVerifiedAt: new Date() } });
      await app.prisma.coachAthlete.create({ data: { coachId: c.userId.coachA, athleteId: user.id, status } });
      return user.id;
    };
    second = await mk("segundo@e2e.test", "Segundo Atleta", "active");
    pending = await mk("pendiente@e2e.test", "Atleta Pendiente", "pending");
    teamId = (await app.http("post", "/teams", coach()).send({ name: "Voley", athleteIds: [c.userId.athleteA, second, pending] })).body.id;
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(async () => {
    await app.prisma.teamEvent.deleteMany({});
  });

  it("sin sesión 401; el atleta no crea ni lee el equipo (403); otro coach recibe 404 en todo", async () => {
    const id = (await create(match())).body.id;
    expect((await app.http("get", `/teams/${teamId}/events?${range()}`)).status).toBe(401);
    expect((await app.http("get", `/me/team-events?${range()}`)).status).toBe(401);
    expect((await app.http("get", `/me/team-events?${range()}`, coach())).status).toBe(403);
    expect((await create(match(), c.token.athleteA)).status).toBe(403);
    expect((await app.http("get", `/teams/${teamId}/calendar?${range()}`, c.token.athleteA)).status).toBe(403);
    expect((await app.http("get", `/teams/${teamId}/rankings`, c.token.athleteA)).status).toBe(403);
    const b = c.token.coachB;
    for (const res of [
      await app.http("get", `/teams/${teamId}/events?${range()}`, b),
      await create(match(), b),
      await app.http("patch", `/teams/${teamId}/events/${id}`, b).send({ title: "Mío" }),
      await app.http("delete", `/teams/${teamId}/events/${id}`, b),
      await app.http("get", `/teams/${teamId}/calendar?${range()}`, b),
      await app.http("get", `/teams/${teamId}/rankings`, b),
    ]) {
      expect(res.status).toBe(404);
    }
    // Un evento de otro equipo no se toca desde este.
    const other = (await app.http("post", "/teams", coach()).send({ name: "Otro", athleteIds: [] })).body.id;
    expect((await app.http("delete", `/teams/${other}/events/${id}`, coach())).status).toBe(404);
    expect(await app.prisma.teamEvent.count()).toBe(1);
    await app.http("delete", `/teams/${other}`, coach());
  });

  it("valida lo que llega: sin lesión, sin campos de más y con fechas coherentes", async () => {
    for (const body of [match({ type: "injury" }), match({ intensity: "high" }), match({ sport: "volleyball" }), match({ title: "" }), match({ allDay: true }), match({ repeat: { days: [(weekday(day(3)) + 1) % 7], until: null } }), { title: "x" }]) {
      expect((await create(body)).status).toBe(400);
    }
    expect((await app.http("get", `/teams/${teamId}/events?from=${day(0)}&to=${day(120)}`, coach())).status).toBe(400);
  });

  it("una serie se expande y editar o eliminar cambia todas sus repeticiones", async () => {
    const start = day(1);
    const created = await create(match({ type: "training", title: "Entrenamiento", date: start, repeat: { days: [weekday(start)], until: day(15) } }));
    expect(created.status).toBe(201);
    const list = async () => (await app.http("get", `/teams/${teamId}/events?${range()}`, coach())).body.events;
    const before = await list();
    expect(before.map((e: any) => e.date)).toEqual([day(1), day(8), day(15)]);
    expect(before[1]).toMatchObject({ seriesId: created.body.id, seriesDate: start, teamName: "Voley", teamId });
    const patched = await app.http("patch", `/teams/${teamId}/events/${created.body.id}`, coach()).send({ title: "Fuerza", startTime: "18:30" });
    expect(patched.status).toBe(200);
    expect((await list()).map((e: any) => [e.title, e.startTime])).toEqual(Array(3).fill(["Fuerza", "18:30"]));
    expect((await app.http("delete", `/teams/${teamId}/events/${created.body.id}`, coach())).status).toBe(204);
    expect(await list()).toEqual([]);
  });

  it("el atleta lo ve por estar en el equipo, con la forma acordada, y deja de verlo al salir o terminar la relación", async () => {
    await create(match());
    const events = await mine(c.token.athleteA);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ teamName: "Voley", title: "Partido de liga", notes: "Llegar antes." });
    expect(Object.keys(events[0]).sort()).toEqual(Object.keys(teamEventsFixture.events[0]).sort());
    // No se copia a sus actividades.
    expect((await app.http("get", `/me/events?${range()}`, c.token.athleteA)).body.events).toEqual([]);
    expect(await mine(c.token.athleteB)).toEqual([]);

    await app.prisma.coachAthlete.update({ where: { coachId_athleteId: { coachId: c.userId.coachA, athleteId: c.userId.athleteA } }, data: { status: "inactive" } });
    expect(await mine(c.token.athleteA)).toEqual([]);
    await app.prisma.coachAthlete.update({ where: { coachId_athleteId: { coachId: c.userId.coachA, athleteId: c.userId.athleteA } }, data: { status: "active" } });

    expect((await app.http("delete", `/teams/${teamId}/members/${c.userId.athleteA}?today=${day(0)}`, coach())).status).toBe(204);
    expect(await mine(c.token.athleteA)).toEqual([]);
    await app.http("post", `/teams/${teamId}/members`, coach()).send({ athleteIds: [c.userId.athleteA] });
  });

  it("el calendario del equipo trae las actividades de los atletas activos sin sus notas (R7)", async () => {
    await create(match());
    const own = await app.http("post", "/me/events", c.token.athleteA).send({ type: "travel", title: "Viaje", date: day(2), notes: "dato privado de salud" });
    expect(own.status).toBe(201);
    const res = await app.http("get", `/teams/${teamId}/calendar?${range()}`, coach());
    expect(res.status).toBe(200);
    expect(res.body.teamEvents).toHaveLength(1);
    expect(res.body.athleteEvents).toEqual([expect.objectContaining({ athleteId: c.userId.athleteA, title: "Viaje", notes: null })]);
    expect(JSON.stringify(res.body)).not.toContain("dato privado");
    await app.prisma.athleteEvent.deleteMany({});
  });

  it("el ranking ordena por cumplimiento y no da cifras de quien no está activo", async () => {
    const res = await app.http("get", `/teams/${teamId}/rankings?period=weeks4`, coach());
    expect(res.status).toBe(200);
    expect(res.body.period).toBe("weeks4");
    expect(res.body.rows.map((r: any) => r.athleteId).sort()).toEqual([c.userId.athleteA, second, pending].sort());
    expect(res.body.rows.find((r: any) => r.athleteId === pending)).toMatchObject({ status: "pending", assigned: 0, completed: 0, percent: null });
    expect((await app.http("get", `/teams/${teamId}/rankings?period=cycle`, coach())).status).toBe(200);
    expect((await app.http("get", `/teams/${teamId}/rankings?period=todo`, coach())).status).toBe(400);
  });

  it("al borrar el equipo se borran sus eventos, y la exportación del coach los incluye", async () => {
    const other = (await app.http("post", "/teams", coach()).send({ name: "Temporal", athleteIds: [] })).body.id;
    await app.http("post", `/teams/${other}/events`, coach()).send(match());
    const exported = await app.http("get", "/users/me/export", coach());
    expect(exported.status).toBe(200);
    expect(exported.body.teamEvents).toHaveLength(1);
    expect((await app.http("delete", `/teams/${other}`, coach())).status).toBe(204);
    expect(await app.prisma.teamEvent.count()).toBe(0);
  });
});
