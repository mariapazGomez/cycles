import { passwordHash, resetDatabase, startApp, type TestApp } from "./support/app";
import { seedScenario, type Scenario } from "./support/seed";

// Consultas agrupadas del coach (CYC-325): acceso ajeno, relación terminada, lo que trae cada una,
// sus límites y páginas, y que cuentan lo mismo que los pedidos por atleta que reemplazan.

describe("Consultas agrupadas del coach", () => {
  let app: TestApp;
  let c: Scenario;
  let teamId: string;
  let second: string;
  const DAY = 86_400_000;
  const day = (offset: number) => new Date(Date.now() + offset * DAY).toISOString().slice(0, 10);
  const date = (offset: number) => new Date(`${day(offset)}T00:00:00.000Z`);
  const monday = -((new Date().getUTCDay() + 6) % 7);
  const coach = () => c.token.coachA;
  const get = (url: string, token: string | undefined = coach()) => app.http("get", url, token);
  const post = (url: string, body: object, token = coach()) => app.http("post", url, token).send(body);
  const sessionsUrl = (from = day(monday), to = day(monday + 6), more = "") => `/coach/board/sessions?from=${from}&to=${to}${more}`;
  const eventsUrl = (more = "") => `/coach/board/events?from=${day(monday)}&to=${day(monday + 6)}${more}`;
  const names = (res: { body: any }) => res.body.sessions.map((s: any) => s.name).sort();

  const athleteUser = async (email: string, name: string) => {
    const user = await app.prisma.user.create({ data: { email, name, role: "athlete", passwordHash: await passwordHash(), emailVerifiedAt: new Date() } });
    await app.prisma.coachAthlete.create({ data: { coachId: c.userId.coachA, athleteId: user.id, status: "active" } });
    return user.id;
  };
  const cycle = (athleteId: string, name: string, from: number, to: number, data: object = {}, coachId = c.userId.coachA) =>
    app.prisma.trainingCycle.create({ data: { coachId, athleteId, name, startDate: date(from), endDate: date(to), cycleType: "mesocycle", ...data } });
  const session = (cycleId: string, name: string, weekNumber: number, slotNumber: number, data: { scheduledDate?: Date; deletedAt?: Date; status?: "completed" | "skipped" } = {}, sets = 3) =>
    app.prisma.trainingSession.create({
      data: { cycleId, name, weekNumber, slotNumber, ...data, sessionExercises: { create: [{ exerciseId: c.globalExercise, orderIndex: 1, targetSets: sets, targetReps: 8 }] } },
    });

  beforeAll(async () => {
    app = await startApp();
    await resetDatabase(app.prisma);
    c = await seedScenario(app);
    second = await athleteUser("segundo@e2e.test", "Segundo Atleta");
    teamId = (await post("/teams", { name: "Voley", athleteIds: [second] })).body.id;
  });
  afterAll(async () => {
    await app?.close();
  });

  describe("permisos", () => {
    const routes = () => [sessionsUrl(), eventsUrl(), "/coach/board/adherence", `/teams/${teamId}/cycle-details?from=${day(0)}&to=${day(27)}`];

    it("sin sesión 401 y el atleta 403 en todas", async () => {
      for (const url of routes()) {
        expect((await app.http("get", url)).status).toBe(401);
        expect((await get(url, c.token.athleteA)).status).toBe(403);
      }
    });

    it("cada coach ve solo lo suyo y el equipo ajeno responde 404", async () => {
      const b = c.token.coachB;
      const sessions = await get(sessionsUrl(day(-30), day(30)), b);
      expect(names(sessions)).toEqual(["Sesión B"]);
      expect(sessions.body.cycles.map((x: any) => x.athleteId)).toEqual([c.userId.athleteB]);
      expect((await get("/coach/board/adherence", b)).body.athletes.map((a: any) => a.athleteId)).toEqual([c.userId.athleteB]);
      expect((await get(sessionsUrl(day(-30), day(30), `&teamId=${teamId}`), b)).status).toBe(404);
      expect((await get(`/teams/${teamId}/cycle-details?from=${day(0)}&to=${day(27)}`, b)).status).toBe(404);
    });

    it("no se puede elegir el atleta ni el coach: los ids que se agreguen no cambian nada", async () => {
      const sessions = await get(sessionsUrl(day(-30), day(30), `&athleteId=${c.userId.athleteB}&coachId=${c.userId.coachB}`));
      expect(sessions.status).toBe(200);
      expect(names(sessions)).not.toContain("Sesión B");
      const adherence = (await get(`/coach/board/adherence?coachId=${c.userId.coachB}&athleteId=${c.userId.athleteB}`)).body.athletes;
      expect(adherence.map((a: any) => a.athleteId)).not.toContain(c.userId.athleteB);
    });

    it("una relación terminada no aparece en ninguna (R5)", async () => {
      await app.prisma.athleteEvent.create({ data: { athleteId: c.userId.athleteC, type: "match", title: "Partido de C", date: date(monday + 2), allDay: true } });
      expect(names(await get(sessionsUrl(day(-30), day(30))))).not.toContain("Sesión C");
      expect((await get(eventsUrl())).body.events.map((e: any) => e.athleteId)).not.toContain(c.userId.athleteC);
      expect((await get("/coach/board/adherence")).body.athletes.map((a: any) => a.athleteId)).not.toContain(c.userId.athleteC);
    });

    it("un ciclo de otro coach sobre un atleta compartido no se filtra", async () => {
      await app.prisma.coachAthlete.create({ data: { coachId: c.userId.coachB, athleteId: second, status: "active" } });
      const foreign = await cycle(second, "Ciclo ajeno", -7, 20, {}, c.userId.coachB);
      await session(foreign.id, "Sesión de otro coach", 2, 1, { scheduledDate: date(0) });
      expect(names(await get(sessionsUrl(day(-30), day(30))))).not.toContain("Sesión de otro coach");
      const mine = (await get("/coach/board/adherence")).body.athletes.find((a: any) => a.athleteId === second);
      expect(mine).toMatchObject({ assigned: 0, completed: 0 });
      await app.prisma.sessionExercise.deleteMany({ where: { session: { cycleId: foreign.id } } });
      await app.prisma.trainingSession.deleteMany({ where: { cycleId: foreign.id } });
      await app.prisma.trainingCycle.delete({ where: { id: foreign.id } });
      await app.prisma.coachAthlete.deleteMany({ where: { coachId: c.userId.coachB, athleteId: second } });
    });
  });

  describe("sesiones", () => {
    let athlete: string;
    let main: string;

    beforeAll(async () => {
      athlete = await athleteUser("sesiones@e2e.test", "Atleta Sesiones");
      // Empezó hace tres semanas, un lunes: la semana que se pide es la 4.
      main = (await cycle(athlete, "Principal", monday - 21, monday + 34)).id;
      await session(main, "De la semana", 4, 1, {}, 5);
      await session(main, "Movida a esta semana", 7, 1, { scheduledDate: date(monday + 3) }, 4);
      await session(main, "De otra semana", 6, 1, { scheduledDate: date(monday + 15) }, 9);
      await session(main, "Quitada", 4, 2, { deletedAt: new Date() });
      const macro = await cycle(athlete, "Macrociclo", monday - 21, monday + 80, { cycleType: "macrocycle" });
      const child = await cycle(athlete, "Dentro del macrociclo", monday, monday + 27, { parentCycleId: macro.id });
      await session(child.id, "Del ciclo contenido", 1, 1);
      const archivedChild = await cycle(athlete, "Contenido archivado", monday, monday + 27, { parentCycleId: macro.id, status: "archived" });
      await session(archivedChild.id, "De un contenido archivado", 1, 1);
      const archived = await cycle(athlete, "Archivado", monday, monday + 27, { status: "archived" });
      await session(archived.id, "De un ciclo archivado", 1, 1);
      const past = await cycle(athlete, "Terminado antes", monday - 60, monday - 30);
      await session(past.id, "De un ciclo anterior", 1, 1);
    });

    const mine = (body: any) => {
      const ids = new Set(body.cycles.filter((x: any) => x.athleteId === athlete).map((x: any) => x.id));
      return body.sessions.filter((s: any) => ids.has(s.cycleId));
    };

    it("trae las de la semana, las movidas a ella y las de ciclos dentro de un macrociclo activo", async () => {
      const res = await get(sessionsUrl());
      expect(res.status).toBe(200);
      expect(mine(res.body).map((s: any) => s.name).sort()).toEqual(["De la semana", "Del ciclo contenido", "Movida a esta semana"]);
      expect(res.body.nextCursor).toBeNull();
      expect(res.body.cycles.filter((x: any) => x.athleteId === athlete).map((x: any) => x.name).sort()).toEqual(["Dentro del macrociclo", "Principal"]);
    });

    it("no lleva cierres, notas ni datos de salud; las series solo si se piden", async () => {
      const plain = await get(sessionsUrl());
      expect(Object.keys(mine(plain.body)[0]).sort()).toEqual(["cycleId", "id", "name", "scheduledDate", "slotNumber", "status", "teamSessionId", "weekNumber"]);
      expect(plain.body.cycles[0].datedVolumes).toBeUndefined();
      const withVolumes = await get(sessionsUrl(day(monday), day(monday + 6), "&volumes=true"));
      expect(mine(withVolumes.body).find((s: any) => s.name === "De la semana").plannedSets).toBe(5);
      // El tercio más alto se mide con todo el ciclo: también las series de las que no se ven.
      expect(withVolumes.body.cycles.find((x: any) => x.id === main).datedVolumes.sort()).toEqual([4, 9]);
    });

    it("acota el tramo y valida las fechas y el equipo", async () => {
      expect((await get(sessionsUrl(day(0), day(61)))).status).toBe(200);
      expect((await get(sessionsUrl(day(0), day(62)))).status).toBe(400);
      expect((await get(sessionsUrl(day(3), day(0)))).status).toBe(400);
      expect((await get("/coach/board/sessions?from=ayer&to=hoy")).status).toBe(400);
      expect((await get(sessionsUrl(day(0), day(6), "&teamId=otro"))).status).toBe(400);
    });

    it("con equipo trae solo a sus integrantes", async () => {
      const empty = await get(sessionsUrl(day(monday), day(monday + 6), `&teamId=${teamId}`));
      expect(empty.body).toEqual({ cycles: [], sessions: [], nextCursor: null });
      const own = await cycle(second, "Del integrante", monday, monday + 27);
      await session(own.id, "Sesión del integrante", 1, 1);
      expect(names(await get(sessionsUrl(day(monday), day(monday + 6), `&teamId=${teamId}`)))).toEqual(["Sesión del integrante"]);
    });

    it("pagina cuando hay más sesiones que el tope, sin repetir ni perder", async () => {
      const big = await cycle(second, "Muy cargado", monday, monday + 27);
      await app.prisma.trainingSession.createMany({
        data: Array.from({ length: 2050 }, (_, i) => ({ cycleId: big.id, name: `Carga ${i}`, weekNumber: 1, slotNumber: i + 1 })),
      });
      const url = sessionsUrl(day(monday), day(monday + 6), `&teamId=${teamId}`);
      const first = await get(url);
      expect(first.body.sessions).toHaveLength(2000);
      expect(first.body.cycles.length).toBeGreaterThan(0);
      const rest = await get(`${url}&cursor=${first.body.nextCursor}`);
      expect(rest.body.cycles).toEqual([]);
      expect(rest.body.nextCursor).toBeNull();
      const ids = [...first.body.sessions, ...rest.body.sessions].map((s: any) => s.id);
      expect(ids).toHaveLength(2051);
      expect(new Set(ids).size).toBe(2051);
      await app.prisma.trainingSession.deleteMany({ where: { cycleId: big.id } });
      await app.prisma.trainingCycle.delete({ where: { id: big.id } });
    });
  });

  describe("actividades y cumplimiento", () => {
    let athlete: string;

    beforeAll(async () => {
      athlete = await athleteUser("cuentas@e2e.test", "Atleta Cuentas");
      await app.prisma.athleteEvent.create({ data: { athleteId: athlete, type: "match", title: "Partido", date: date(monday + 5), allDay: true, notes: "Privada" } });
      await app.prisma.athleteEvent.create({
        data: { athleteId: athlete, type: "training", title: "Natación", date: date(monday - 14), allDay: true, repeatDays: [1, 3] },
      });
      // Ciclos activos y archivados, semanas dentro y fuera de las cuatro últimas, un inicio a mitad de semana y una sesión quitada.
      const a = await cycle(athlete, "Actual", monday - 18, monday + 30);
      for (let week = 1; week <= 6; week += 1) await session(a.id, `A${week}`, week, 1, week % 2 ? { status: "completed" } : {});
      await session(a.id, "A quitada", 3, 2, { deletedAt: new Date(), status: "completed" });
      const old = await cycle(athlete, "Anterior", monday - 45, monday - 10, { status: "archived" });
      for (let week = 1; week <= 5; week += 1) await session(old.id, `V${week}`, week, 1, { status: week > 3 ? "completed" : "skipped" });
    });

    it("las actividades llegan sin notas e iguales a las del pedido por atleta", async () => {
      const all = (await get(eventsUrl())).body;
      const own = all.events.filter((e: any) => e.athleteId === athlete).map(({ athleteId: _, ...e }: any) => e);
      const single = (await get(`/athletes/${athlete}/events?from=${day(monday)}&to=${day(monday + 6)}`)).body.events;
      expect(own).toEqual(single);
      expect(own.length).toBeGreaterThan(1);
      expect(own.every((e: any) => e.notes === null)).toBe(true);
      expect(all.nextCursor).toBeNull();
    });

    it("el cumplimiento coincide con el resumen de cada atleta", async () => {
      for (const weeks of [1, 4, 8]) {
        const all = (await get(`/coach/board/adherence?weeks=${weeks}`)).body.athletes;
        expect(all.length).toBeGreaterThan(2);
        for (const row of all) {
          const summary = (await get(`/athletes/${row.athleteId}/summary?weeks=${weeks}`)).body.weeks;
          expect(row).toEqual({
            athleteId: row.athleteId,
            assigned: summary.reduce((n: number, w: any) => n + w.assigned, 0),
            completed: summary.reduce((n: number, w: any) => n + w.completed, 0),
          });
        }
      }
      const four = (await get("/coach/board/adherence")).body.athletes.find((a: any) => a.athleteId === athlete);
      expect(four.assigned).toBeGreaterThan(0);
      expect((await get("/coach/board/adherence?weeks=27")).status).toBe(400);
    });

    it("con más de cien atletas van por páginas, sin repetir ni perder", async () => {
      const hash = await passwordHash();
      await app.prisma.user.createMany({ data: Array.from({ length: 110 }, (_, i) => ({ email: `masivo${i}@e2e.test`, name: `Masivo ${i}`, role: "athlete" as const, passwordHash: hash })) });
      const extra = await app.prisma.user.findMany({ where: { email: { startsWith: "masivo" } }, select: { id: true } });
      await app.prisma.coachAthlete.createMany({ data: extra.map((u) => ({ coachId: c.userId.coachA, athleteId: u.id, status: "active" as const })) });
      const total = await app.prisma.coachAthlete.count({ where: { coachId: c.userId.coachA, status: "active" } });
      const first = (await get("/coach/board/adherence")).body;
      expect(first.athletes).toHaveLength(100);
      const rest = (await get(`/coach/board/adherence?cursor=${first.nextCursor}`)).body;
      expect(rest.nextCursor).toBeNull();
      const ids = [...first.athletes, ...rest.athletes].map((a: any) => a.athleteId);
      expect(ids).toHaveLength(total);
      expect(new Set(ids).size).toBe(total);
      const events = (await get(eventsUrl())).body;
      expect(events.nextCursor).toBe(first.nextCursor);
      const more = (await get(eventsUrl(`&cursor=${events.nextCursor}`))).body;
      const owners = new Set([...events.events, ...more.events].map((e: any) => e.athleteId));
      expect(owners.has(athlete)).toBe(true);
      await app.prisma.coachAthlete.deleteMany({ where: { athleteId: { in: extra.map((u) => u.id) } } });
      await app.prisma.user.deleteMany({ where: { id: { in: extra.map((u) => u.id) } } });
    });
  });

  describe("planes del equipo", () => {
    let cycleId: string;
    let teamSessionId: string;
    let athletes: string[];

    beforeAll(async () => {
      athletes = [second];
      for (const name of ["Movida", "Empezada", "Ajustada", "Atrasada"]) athletes.push(await athleteUser(`${name}@e2e.test`, name));
      expect((await post(`/teams/${teamId}/members`, { athleteIds: athletes.slice(1) })).status).toBeLessThan(300);
      const created = await post(`/teams/${teamId}/cycles`, { name: "Pretemporada", athleteIds: athletes, startDate: day(0), endDate: day(27), today: day(0) });
      expect(created.status).toBe(201);
      cycleId = created.body.id;
      teamSessionId = (await post(`/team-cycles/${cycleId}/sessions`, { routineId: c.routineA, scheduledDate: day(3), today: day(0) })).body.sessionId;
      const copy = async (athleteId: string) => app.prisma.trainingSession.findFirstOrThrow({ where: { teamSessionId, cycle: { athleteId } } });
      await app.prisma.trainingSession.update({ where: { id: (await copy(athletes[1])).id }, data: { scheduledDate: date(5) } });
      await app.prisma.trainingSession.update({ where: { id: (await copy(athletes[2])).id }, data: { startedAt: new Date() } });
      await app.prisma.trainingSession.update({ where: { id: (await copy(athletes[3])).id }, data: { detachedAt: new Date() } });
      await app.prisma.trainingSession.update({ where: { id: (await copy(athletes[4])).id }, data: { scheduledDate: date(-1) } });
    });

    it("cada copia dice su día y si recibiría un cambio de hoy, o por qué no", async () => {
      const detail = (await get(`/team-cycles/${cycleId}?today=${day(0)}`)).body;
      const copies = detail.sessions[0].copies;
      const of = (id: string) => copies.find((x: any) => x.athleteId === id);
      const fact = (id: string) => [of(id).scheduledDate.slice(0, 10), of(id).skip, of(id).status];
      expect(fact(athletes[0])).toEqual([day(3), null, "pending"]);
      expect(fact(athletes[1])).toEqual([day(5), null, "pending"]);
      expect(fact(athletes[2])).toEqual([day(3), "recorded", "pending"]);
      expect(fact(athletes[3])).toEqual([day(3), "adjusted", "pending"]);
      expect(fact(athletes[4])).toEqual([day(-1), "past", "pending"]);
      expect((await get(`/team-cycles/${cycleId}?today=${day(9)}`)).status).toBe(400);
    });

    it("lo que anuncia es lo que hace el cambio", async () => {
      const before = (await get(`/team-cycles/${cycleId}?today=${day(0)}`)).body.sessions[0].copies;
      const expected = { updated: 0, skipped: { adjusted: 0, recorded: 0, past: 0, removed: 0 } as Record<string, number> };
      for (const copy of before) {
        if (copy.skip) expected.skipped[copy.skip] += 1;
        else expected.updated += 1;
      }
      const res = await app.http("patch", `/team-sessions/${teamSessionId}`, coach()).send({ name: "Fuerza", today: day(0) });
      expect(res.status).toBe(200);
      expect(res.body.summary ?? res.body).toMatchObject(expected);
    });

    it("los planes del tramo llegan en un pedido, iguales a pedirlos uno por uno", async () => {
      const later = (await post(`/teams/${teamId}/cycles`, { name: "Competencia", athleteIds: [second], startDate: day(28), endDate: day(55), today: day(0) })).body.id;
      const range = async (from: number, to: number) => (await get(`/teams/${teamId}/cycle-details?from=${day(from)}&to=${day(to)}&today=${day(0)}`)).body.cycles;
      const both = await range(0, 40);
      expect(both.map((x: any) => x.id)).toEqual([cycleId, later]);
      expect(both[0]).toEqual((await get(`/team-cycles/${cycleId}?today=${day(0)}`)).body);
      expect((await range(0, 10)).map((x: any) => x.id)).toEqual([cycleId]);
      expect(await range(70, 80)).toEqual([]);
      expect((await get(`/teams/${teamId}/cycle-details?from=${day(0)}&to=${day(70)}`)).status).toBe(400);
      expect((await get(`/teams/${teamId}/cycle-details`)).status).toBe(400);
    });
  });
});
