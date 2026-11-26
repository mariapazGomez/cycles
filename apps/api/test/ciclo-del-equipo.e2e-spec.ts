import { passwordHash, resetDatabase, startApp, type TestApp } from "./support/app";
import { seedScenario, type Scenario } from "./support/seed";

// Ciclo del equipo (CYC-314): plan maestro, copias por atleta, propagación, separación, entradas y salidas.

describe("Ciclo del equipo", () => {
  let app: TestApp;
  let c: Scenario;
  let teamId: string;
  let second: string; // otro atleta activo del coach A
  let pending: string;
  const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
  const coach = () => c.token.coachA;
  const post = (url: string, body: object, token = coach()) => app.http("post", url, token).send(body);
  const range = () => ({ startDate: day(0), endDate: day(27), today: day(0) });

  const athleteUser = async (email: string, name: string, status: "active" | "pending") => {
    const user = await app.prisma.user.create({ data: { email, name, role: "athlete", passwordHash: await passwordHash(), emailVerifiedAt: new Date() } });
    await app.prisma.coachAthlete.create({ data: { coachId: c.userId.coachA, athleteId: user.id, status } });
    return user.id;
  };
  const makeCycle = async (athleteIds: string[], extra: object = {}) =>
    (await post(`/teams/${teamId}/cycles`, { name: "Pretemporada", athleteIds, ...range(), ...extra }));
  const addSession = async (cycleId: string, offset: number) => (await post(`/team-cycles/${cycleId}/sessions`, { routineId: c.routineA, scheduledDate: day(offset), today: day(0) }));
  const detail = async (cycleId: string) => (await app.http("get", `/team-cycles/${cycleId}`, coach())).body;
  const copyOf = (sessions: any[], teamSessionId: string, athleteId: string) =>
    sessions.find((s) => s.id === teamSessionId).copies.find((x: any) => x.athleteId === athleteId);
  const sessionRow = (id: string) =>
    app.prisma.trainingSession.findUniqueOrThrow({ where: { id }, include: { sessionExercises: { orderBy: { orderIndex: "asc" } }, cycle: true } });
  const structureOf = (master: any, over: object = {}) => ({
    exercises: master.exercises.map((e: any) => ({ id: e.id, exerciseId: e.exerciseId, targetSets: e.targetSets, targetReps: e.targetReps, ...over })),
  });

  beforeAll(async () => {
    app = await startApp();
    await resetDatabase(app.prisma);
    c = await seedScenario(app);
    second = await athleteUser("segundo@e2e.test", "Segundo Atleta", "active");
    pending = await athleteUser("pendiente@e2e.test", "Atleta Pendiente", "pending");
    teamId = (await post("/teams", { name: "Voley", athleteIds: [c.userId.athleteA, second, pending] })).body.id;
  });
  afterAll(async () => {
    await app?.close();
  });
  // Cada bloque parte sin ciclos de equipo.
  const reset = async () => {
    for (const t of await app.prisma.teamCycle.findMany({ select: { id: true } })) await app.http("delete", `/team-cycles/${t.id}`, coach());
    await app.prisma.teamCycle.deleteMany({});
  };

  describe("permisos", () => {
    it("sin sesión 401; el atleta 403; otro coach 404 en todo", async () => {
      await reset();
      const id = (await makeCycle([c.userId.athleteA])).body.id;
      const s = (await addSession(id, 3)).body.sessionId;
      expect((await app.http("get", `/team-cycles/${id}`)).status).toBe(401);
      expect((await app.http("get", `/team-cycles/${id}`, c.token.athleteA)).status).toBe(403);
      const b = c.token.coachB;
      for (const res of [
        await app.http("get", `/team-cycles/${id}`, b),
        await app.http("get", `/teams/${teamId}/cycles`, b),
        await post(`/teams/${teamId}/cycles`, { name: "X", athleteIds: [], ...range() }, b),
        await post(`/team-cycles/${id}/sessions`, { routineId: c.routineB, scheduledDate: day(4), today: day(0) }, b),
        await app.http("patch", `/team-sessions/${s}`, b).send({ name: "Mío" }),
        await app.http("delete", `/team-sessions/${s}`, b),
        await post(`/team-sessions/${s}/duplicate`, { scheduledDate: day(5), today: day(0) }, b),
        await app.http("delete", `/team-cycles/${id}`, b),
        await post(`/team-cycles/${id}/members`, { athleteIds: [c.userId.athleteB] }, b),
      ]) {
        expect(res.status).toBe(404);
      }
    });
  });

  describe("crear", () => {
    it("la vista previa dice quién tiene ciclo propio y quién está pendiente", async () => {
      await reset();
      const res = await post(`/teams/${teamId}/cycles/preview`, range());
      expect(res.status).toBe(200);
      const a = res.body.members.find((m: any) => m.id === c.userId.athleteA);
      expect(a.canReceive).toBe(true);
      expect(a.ownCycles.length).toBeGreaterThan(0);
      expect(res.body.members.find((m: any) => m.id === pending)).toMatchObject({ canReceive: false, reason: "pending_invitation" });
    });

    it("crea una copia por atleta elegido, sin pendientes ni ajenos, y un solo ciclo por fechas", async () => {
      await reset();
      expect((await makeCycle([pending])).status).toBe(400);
      expect((await makeCycle([c.userId.athleteB])).status).toBe(400);
      expect((await makeCycle([], { startDate: day(-1) })).status).toBe(400);
      const res = await makeCycle([c.userId.athleteA, second]);
      expect(res.status).toBe(201);
      expect(res.body.athletes).toHaveLength(2);
      expect((await makeCycle([c.userId.athleteA])).status).toBe(409);
      // Su ciclo propio sigue ahí: conviven.
      expect(await app.prisma.trainingCycle.count({ where: { athleteId: c.userId.athleteA, status: "active" } })).toBeGreaterThan(1);
    });
  });

  describe("propagación", () => {
    let cycleId: string;
    let master: any;
    beforeAll(async () => {
      await reset();
      cycleId = (await makeCycle([c.userId.athleteA, second])).body.id;
      expect((await addSession(cycleId, 5)).body.delivered).toBe(2);
      master = (await detail(cycleId)).sessions[0];
    });

    it("cada atleta recibe la sesión y un cambio del equipo llega a todos sin cambiar los ids", async () => {
      const copy = copyOf([master], master.id, second);
      const before = await sessionRow(copy.sessionId);
      const res = await app.http("put", `/team-sessions/${master.id}/structure`, coach()).send(structureOf(master, { targetSets: 7 }));
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ updated: 2 });
      const after = await sessionRow(copy.sessionId);
      expect(after.sessionExercises.map((e) => e.id)).toEqual(before.sessionExercises.map((e) => e.id));
      expect(after.sessionExercises.every((e) => e.targetSets === 7)).toBe(true);
    });

    it("ajustar la sesión de una persona la separa; guardar sin cambios no", async () => {
      const mine = copyOf((await detail(cycleId)).sessions, master.id, second).sessionId;
      const row = await sessionRow(mine);
      const same = { exercises: row.sessionExercises.map((e) => ({ id: e.id, exerciseId: e.exerciseId, targetSets: e.targetSets, targetReps: e.targetReps, ...(e.targetWeight != null ? { targetWeight: e.targetWeight } : {}), ...(e.targetRir != null ? { targetRir: e.targetRir } : {}), ...(e.targetRestSeconds != null ? { targetRestSeconds: e.targetRestSeconds } : {}) })) };
      expect((await app.http("put", `/sessions/${mine}/structure`, coach()).send(same)).status).toBe(200);
      expect((await sessionRow(mine)).detachedAt).toBeNull();

      expect((await app.http("patch", `/session-exercises/${row.sessionExercises[0].id}`, coach()).send({ targetSets: 2 })).status).toBe(200);
      expect((await sessionRow(mine)).detachedAt).not.toBeNull();

      // El detalle se pide antes: supertest no admite un pedido dentro de otro a medio armar.
      const current = (await detail(cycleId)).sessions[0];
      const res = await app.http("put", `/team-sessions/${master.id}/structure`, coach()).send(structureOf(current, { targetSets: 9 }));
      expect(res.body).toMatchObject({ updated: 1, skipped: { adjusted: 1 } });
      expect((await sessionRow(mine)).sessionExercises[0].targetSets).toBe(2);
      // El plan del equipo no cambió por el ajuste de la persona.
      expect((await detail(cycleId)).sessions[0].exercises.every((e: any) => e.targetSets === 9)).toBe(true);
    });

    it("lo registrado nunca cambia", async () => {
      const mine = copyOf((await detail(cycleId)).sessions, master.id, c.userId.athleteA).sessionId;
      const row = await sessionRow(mine);
      const log = await post(`/session-exercises/${row.sessionExercises[0].id}/logs`, { id: "00000000-0000-4000-8000-0000000000d1", setNumber: 1, actualReps: 5, actualWeight: 40 }, c.token.athleteA);
      expect(log.status).toBe(201);
      const current = (await detail(cycleId)).sessions[0];
      const res = await app.http("put", `/team-sessions/${master.id}/structure`, coach()).send(structureOf(current, { targetSets: 4 }));
      expect(res.body).toMatchObject({ updated: 0, skipped: { adjusted: 1, recorded: 1 } });
      expect((await sessionRow(mine)).sessionExercises[0].targetSets).toBe(9);
    });

    it("duplicar copia el contenido actual del plan y llega a todos, sin los ajustes de nadie", async () => {
      const source = (await detail(cycleId)).sessions.find((x: any) => x.id === master.id);
      const res = await post(`/team-sessions/${master.id}/duplicate`, { scheduledDate: day(12), today: day(0) });
      expect(res.status).toBe(201);
      expect(res.body.delivered).toBe(2);
      const twin = (await detail(cycleId)).sessions.find((x: any) => x.id === res.body.sessionId);
      expect(twin.exercises.map((e: any) => e.targetSets)).toEqual(source.exercises.map((e: any) => e.targetSets));
      expect(twin.adjusted).toBe(0);
      expect((await post(`/team-sessions/${master.id}/duplicate`, { scheduledDate: day(-1), today: day(0) })).status).toBe(400);
      expect((await post(`/team-sessions/${master.id}/duplicate`, { scheduledDate: day(60), today: day(0) })).status).toBe(400);
      expect((await app.http("delete", `/team-sessions/${twin.id}`, coach())).status).toBe(200);
    });

    it("mover y eliminar la sesión del equipo alcanza solo a las que la admiten", async () => {
      const added = (await addSession(cycleId, 8)).body.sessionId;
      const moved = await app.http("patch", `/team-sessions/${added}`, coach()).send({ scheduledDate: day(16), today: day(0) });
      expect(moved.body).toMatchObject({ updated: 2 });
      const copy = copyOf((await detail(cycleId)).sessions, added, second).sessionId;
      expect((await sessionRow(copy)).scheduledDate!.toISOString().slice(0, 10)).toBe(day(16));
      expect((await sessionRow(copy)).weekNumber).toBe(3);

      const removed = await app.http("delete", `/team-sessions/${master.id}`, coach());
      expect(removed.body).toMatchObject({ skipped: { adjusted: 1, recorded: 1 } });
      expect(await app.prisma.trainingSession.count({ where: { cycle: { teamCycleId: cycleId }, deletedAt: null } })).toBe(4);
    });
  });

  describe("entradas y salidas", () => {
    let cycleId: string;
    beforeAll(async () => {
      await reset();
      cycleId = (await makeCycle([c.userId.athleteA])).body.id;
      await addSession(cycleId, 0);
      await addSession(cycleId, 6);
    });

    it("quien entra conserva el inicio del equipo y recibe desde ese día, sin duplicar", async () => {
      const added = await post(`/teams/${teamId}/members`, { athleteIds: [second] });
      expect(added.body.pendingTeamCycles.map((t: any) => t.id)).toContain(cycleId);
      const res = await post(`/team-cycles/${cycleId}/members`, { athleteIds: [second], today: day(1) });
      expect(res.body).toMatchObject({ delivered: 1 });
      const copy = await app.prisma.trainingCycle.findFirstOrThrow({ where: { teamCycleId: cycleId, athleteId: second }, include: { sessions: true } });
      expect(copy.startDate.toISOString().slice(0, 10)).toBe(day(0));
      expect(copy.sessions).toHaveLength(1);
      expect((await post(`/team-cycles/${cycleId}/members`, { athleteIds: [second], today: day(1) })).body).toMatchObject({ delivered: 0 });
      expect((await post(`/team-cycles/${cycleId}/members`, { athleteIds: [pending] })).status).toBe(400);
    });

    it("al salir se avisa y se quitan solo las futuras sin registrar ni ajustar", async () => {
      const copy = await app.prisma.trainingCycle.findFirstOrThrow({ where: { teamCycleId: cycleId, athleteId: c.userId.athleteA }, include: { sessions: { orderBy: { scheduledDate: "asc" } } } });
      await app.http("patch", `/sessions/${copy.sessions[0].id}`, coach()).send({ name: "Ajustada para Ana" });
      const impact = await app.http("get", `/teams/${teamId}/members/${c.userId.athleteA}/removal-impact?today=${day(0)}`, coach());
      expect(impact.body).toMatchObject({ removed: 1, keptAdjusted: 1 });
      expect((await app.http("delete", `/teams/${teamId}/members/${c.userId.athleteA}?today=${day(0)}`, coach())).status).toBe(204);
      const left = await app.prisma.trainingSession.findMany({ where: { cycleId: copy.id, deletedAt: null } });
      expect(left.map((s) => s.name)).toEqual(["Ajustada para Ana"]);
      expect((await app.prisma.trainingCycle.findUniqueOrThrow({ where: { id: copy.id } })).teamCycleId).toBeNull();
    });

    it("eliminar el equipo aplica la misma regla y no borra lo del atleta", async () => {
      const before = await app.prisma.trainingCycle.findFirstOrThrow({ where: { teamCycleId: cycleId, athleteId: second } });
      expect((await app.http("delete", `/teams/${teamId}?today=${day(0)}`, coach())).status).toBe(204);
      expect(await app.prisma.teamCycle.count()).toBe(0);
      const after = await app.prisma.trainingCycle.findUniqueOrThrow({ where: { id: before.id } });
      expect(after).toMatchObject({ teamCycleId: null, status: "archived" });
      teamId = (await post("/teams", { name: "Voley 2", athleteIds: [c.userId.athleteA, second] })).body.id;
    });
  });

  describe("fechas del ciclo del equipo", () => {
    it("no se acorta si una sesión del plan o de la ficha de un atleta quedaría fuera", async () => {
      await reset();
      const cycleId = (await makeCycle([c.userId.athleteA])).body.id;
      const master = (await addSession(cycleId, 2)).body.sessionId;
      const copy = await app.prisma.trainingSession.findFirstOrThrow({ where: { teamSessionId: master } });
      // La del atleta se mueve más adelante (queda ajustada); la del plan sigue en su día.
      expect((await app.http("patch", `/sessions/${copy.id}`, coach()).send({ scheduledDate: day(10), today: day(0) })).status).toBe(200);
      const blocked = await app.http("patch", `/team-cycles/${cycleId}`, coach()).send({ endDate: day(5), today: day(0) });
      expect(blocked.status).toBe(409);
      expect(blocked.body.outside).toEqual({ count: 1, dates: [day(10)] });
      const both = await app.http("patch", `/team-cycles/${cycleId}`, coach()).send({ endDate: day(1), today: day(0) });
      expect(both.body.outside).toEqual({ count: 2, dates: [day(2), day(10)] });
      expect((await app.prisma.trainingCycle.findFirstOrThrow({ where: { teamCycleId: cycleId } })).endDate.toISOString().slice(0, 10)).not.toBe(day(5));
      expect((await app.http("patch", `/team-cycles/${cycleId}`, coach()).send({ endDate: day(12), today: day(0) })).status).toBe(200);
      expect((await app.prisma.trainingCycle.findFirstOrThrow({ where: { teamCycleId: cycleId } })).endDate.toISOString().slice(0, 10)).toBe(day(12));
    });
  });

  describe("Hoy con dos ciclos", () => {
    it("/me/today no cambia para la app instalada y lista las sesiones de hoy de ambos", async () => {
      await reset();
      const cycleId = (await makeCycle([c.userId.athleteA])).body.id;
      await addSession(cycleId, 0);
      const res = await app.http("get", `/me/today?date=${day(0)}`, c.token.athleteA);
      expect(res.status).toBe(200);
      const mine = await app.prisma.trainingSession.findFirstOrThrow({ where: { cycle: { teamCycleId: cycleId } } });
      expect(Object.keys(res.body).sort()).toEqual(["assignedToday", "cycle", "session"]);
      expect(res.body.assignedToday.map((a: any) => a.id)).toContain(mine.id);
    });
  });

  describe("quien salió del equipo", () => {
    beforeAll(async () => {
      await reset();
      teamId = (await post("/teams", { name: "Voley salidas", athleteIds: [c.userId.athleteA, second] })).body.id;
    });

    it("deja de contar en el plan; si vuelve, cuenta lo que conservó y no hay fantasmas", async () => {
      const id = (await makeCycle([c.userId.athleteA, second])).body.id;
      const kept = (await addSession(id, 2)).body.sessionId;
      const dropped = (await addSession(id, 4)).body.sessionId;
      const mine = copyOf((await detail(id)).sessions, kept, second).sessionId;
      await app.http("patch", `/sessions/${mine}`, coach()).send({ name: "Ajustada" });
      expect((await app.http("delete", `/teams/${teamId}/members/${second}?today=${day(0)}`, coach())).status).toBe(204);

      const after = (await detail(id)).sessions;
      expect(after.map((x: any) => [x.recipients, x.adjusted])).toEqual([[1, 0], [1, 0]]);
      const moved = await app.http("patch", `/team-sessions/${kept}`, coach()).send({ scheduledDate: day(3), today: day(0) });
      expect(moved.body).toEqual({ updated: 1, skipped: { adjusted: 0, recorded: 0, past: 0, removed: 0 } });

      await post(`/teams/${teamId}/members`, { athleteIds: [second] });
      await post(`/team-cycles/${id}/members`, { athleteIds: [second], today: day(0) });
      const back = (await detail(id)).sessions;
      expect(back.find((x: any) => x.id === kept)).toMatchObject({ recipients: 2, adjusted: 1 });
      expect(back.find((x: any) => x.id === dropped)).toMatchObject({ recipients: 2, adjusted: 0 });
      const removed = await app.http("delete", `/team-sessions/${dropped}`, coach());
      expect(removed.body).toEqual({ updated: 2, skipped: { adjusted: 0, recorded: 0, past: 0, removed: 0 } });
    });
  });
});
