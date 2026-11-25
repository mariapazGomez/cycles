import { resetDatabase, startApp, type TestApp } from "./support/app";
import { seedScenario, type Scenario } from "./support/seed";

// Equipos del coach (CYC-309): autorización entre coaches, reglas de los miembros y borrados.

describe("Equipos del coach", () => {
  let app: TestApp;
  let c: Scenario;
  let pendingId: string;
  const create = (token: string, body: object) => app.http("post", "/teams", token).send(body);
  const add = (token: string, teamId: string, athleteIds: string[]) => app.http("post", `/teams/${teamId}/members`, token).send({ athleteIds });

  beforeAll(async () => {
    app = await startApp();
    await resetDatabase(app.prisma);
    c = await seedScenario(app);
    // Un atleta con invitación pendiente de coachA.
    const pending = await app.prisma.user.create({ data: { email: "pendiente@e2e.test", name: "Atleta Pendiente", role: "athlete", authProvider: "local" } });
    await app.prisma.coachAthlete.create({ data: { coachId: c.userId.coachA, athleteId: pending.id, status: "pending" } });
    pendingId = pending.id;
  });
  afterAll(async () => {
    await app?.close();
  });

  describe("permisos", () => {
    it("sin sesión da 401", async () => {
      expect((await app.http("get", "/teams")).status).toBe(401);
      expect((await app.http("post", "/teams").send({ name: "X" })).status).toBe(401);
    });
    it("el atleta no usa los equipos (403)", async () => {
      expect((await app.http("get", "/teams", c.token.athleteA)).status).toBe(403);
      expect((await create(c.token.athleteA, { name: "X" })).status).toBe(403);
    });
  });

  describe("crear, renombrar y listar", () => {
    let teamId: string;

    it("crea un equipo con atletas que ya tiene, también sin atletas", async () => {
      const empty = await create(c.token.coachA, { name: "  Vacío  " });
      expect(empty.status).toBe(201);
      expect(empty.body).toMatchObject({ name: "Vacío", athletes: [] });
      const res = await create(c.token.coachA, { name: "Voleibol sub-17", athleteIds: [c.userId.athleteA, pendingId] });
      expect(res.status).toBe(201);
      teamId = res.body.id;
      expect(res.body.athletes.map((a: { id: string }) => a.id).sort()).toEqual([c.userId.athleteA, pendingId].sort());
    });

    it("valida el nombre y no repite nombres del mismo coach (sin distinguir mayúsculas)", async () => {
      expect((await create(c.token.coachA, { name: "   " })).status).toBe(400);
      expect((await create(c.token.coachA, {})).status).toBe(400);
      expect((await create(c.token.coachA, { name: "x".repeat(61) })).status).toBe(400);
      expect((await create(c.token.coachA, { name: "voleibol SUB-17" })).status).toBe(409);
      // otro coach sí puede usar el mismo nombre
      expect((await create(c.token.coachB, { name: "Voleibol sub-17" })).status).toBe(201);
    });

    it("no se agregan atletas ajenos, con relación terminada ni inexistentes (400)", async () => {
      for (const ids of [[c.userId.athleteB], [c.userId.athleteC], ["00000000-0000-4000-8000-000000000999"], [c.userId.athleteA, c.userId.athleteB]]) {
        expect((await create(c.token.coachA, { name: `Prueba ${ids.length}${ids[0].slice(-3)}`, athleteIds: ids })).status).toBe(400);
        expect((await add(c.token.coachA, teamId, ids)).status).toBe(400);
      }
      expect((await add(c.token.coachA, teamId, ["no-es-uuid"])).status).toBe(400);
    });

    it("la lista trae nombre, cantidad y los primeros atletas, solo los del coach", async () => {
      const res = await app.http("get", "/teams", c.token.coachA);
      expect(res.status).toBe(200);
      const team = res.body.find((t: { id: string }) => t.id === teamId);
      expect(team).toMatchObject({ name: "Voleibol sub-17", memberCount: 2 });
      expect(team.members).toHaveLength(2);
      expect(res.body.every((t: { id: string; name: string }) => t.name !== "Voleibol sub-17" || t.id === teamId)).toBe(true);
      const b = await app.http("get", "/teams", c.token.coachB);
      expect(b.body).toHaveLength(1);
    });

    it("renombra (y no a un nombre que ya usa)", async () => {
      expect((await app.http("patch", `/teams/${teamId}`, c.token.coachA).send({ name: "Voleibol sub-18" })).body.name).toBe("Voleibol sub-18");
      expect((await app.http("patch", `/teams/${teamId}`, c.token.coachA).send({ name: "Vacío" })).status).toBe(409);
      expect((await app.http("patch", `/teams/${teamId}`, c.token.coachA).send({ name: "" })).status).toBe(400);
    });

    it("el detalle trae el estado de cada atleta y su ciclo vigente", async () => {
      const res = await app.http("get", `/teams/${teamId}`, c.token.coachA);
      expect(res.status).toBe(200);
      const a = res.body.athletes.find((x: { id: string }) => x.id === c.userId.athleteA);
      expect(a).toMatchObject({ status: "active", name: "Atleta A" });
      const p = res.body.athletes.find((x: { id: string }) => x.id === pendingId);
      expect(p).toMatchObject({ status: "pending", currentCycle: null });
    });
  });

  describe("aislamiento entre coaches", () => {
    let teamA: string;
    beforeAll(async () => {
      teamA = (await create(c.token.coachA, { name: "Solo de A", athleteIds: [c.userId.athleteA] })).body.id;
    });

    it("otro coach no ve, renombra, borra ni toca los miembros del equipo (404)", async () => {
      expect((await app.http("get", `/teams/${teamA}`, c.token.coachB)).status).toBe(404);
      expect((await app.http("patch", `/teams/${teamA}`, c.token.coachB).send({ name: "Mío" })).status).toBe(404);
      expect((await app.http("delete", `/teams/${teamA}`, c.token.coachB)).status).toBe(404);
      expect((await add(c.token.coachB, teamA, [c.userId.athleteB])).status).toBe(404);
      expect((await app.http("delete", `/teams/${teamA}/members/${c.userId.athleteA}`, c.token.coachB)).status).toBe(404);
      const still = await app.http("get", `/teams/${teamA}`, c.token.coachA);
      expect(still.body).toMatchObject({ name: "Solo de A" });
      expect(still.body.athletes).toHaveLength(1);
    });

    it("un coach no mete en su equipo a un atleta de otro coach (400)", async () => {
      const mine = (await create(c.token.coachB, { name: "De B" })).body.id;
      expect((await add(c.token.coachB, mine, [c.userId.athleteA])).status).toBe(400);
    });
  });

  describe("miembros", () => {
    it("un atleta puede estar en varios equipos; agregar es idempotente; quitar no borra al atleta", async () => {
      const t1 = (await create(c.token.coachA, { name: "Fuerza mañana" })).body.id;
      const t2 = (await create(c.token.coachA, { name: "Fuerza tarde" })).body.id;
      expect((await add(c.token.coachA, t1, [c.userId.athleteA])).status).toBe(201);
      expect((await add(c.token.coachA, t1, [c.userId.athleteA])).body.athletes).toHaveLength(1);
      await add(c.token.coachA, t2, [c.userId.athleteA]);
      const athletes = await app.http("get", "/athletes", c.token.coachA);
      const row = athletes.body.find((r: { athlete: { id: string } }) => r.athlete.id === c.userId.athleteA);
      const names = row.teams.map((t: { name: string }) => t.name);
      expect(names).toEqual(expect.arrayContaining(["Fuerza mañana", "Fuerza tarde"]));

      expect((await app.http("delete", `/teams/${t1}/members/${c.userId.athleteA}`, c.token.coachA)).status).toBe(204);
      expect((await app.http("delete", `/teams/${t1}/members/${c.userId.athleteA}`, c.token.coachA)).status).toBe(404);
      expect(await app.prisma.coachAthlete.count({ where: { coachId: c.userId.coachA, athleteId: c.userId.athleteA, status: "active" } })).toBe(1);
      expect(await app.prisma.user.count({ where: { id: c.userId.athleteA } })).toBe(1);
    });

    it("eliminar un equipo borra sus miembros y nada más", async () => {
      const t = (await create(c.token.coachA, { name: "Efímero", athleteIds: [c.userId.athleteA] })).body.id;
      expect((await app.http("delete", `/teams/${t}`, c.token.coachA)).status).toBe(204);
      expect(await app.prisma.teamMember.count({ where: { teamId: t } })).toBe(0);
      expect(await app.prisma.team.count({ where: { id: t } })).toBe(0);
      expect(await app.prisma.coachAthlete.count({ where: { coachId: c.userId.coachA, athleteId: c.userId.athleteA } })).toBe(1);
      expect((await app.http("get", `/teams/${t}`, c.token.coachA)).status).toBe(404);
    });

    it("el equipo de otro coach no aparece en la lista de atletas del primero", async () => {
      const athletes = await app.http("get", "/athletes", c.token.coachB);
      const row = athletes.body.find((r: { athlete: { id: string } }) => r.athlete.id === c.userId.athleteB);
      expect(row.teams).toEqual([]);
    });
  });

  describe("borrado de cuenta", () => {
    it("si el atleta borra su cuenta sale de los equipos; si el coach borra la suya se van sus equipos", async () => {
      const team = (await create(c.token.coachB, { name: "Equipo de B", athleteIds: [c.userId.athleteB] })).body.id;
      const other = (await create(c.token.coachA, { name: "Equipo con A", athleteIds: [c.userId.athleteA, pendingId] })).body.id;

      const del = await app.http("delete", "/users/me", c.token.athleteA).send({ confirmation: "ELIMINAR" });
      expect([200, 204]).toContain(del.status);
      expect(await app.prisma.teamMember.count({ where: { athleteId: c.userId.athleteA } })).toBe(0);
      // El equipo y los demás atletas siguen.
      expect((await app.http("get", `/teams/${other}`, c.token.coachA)).body.athletes.map((a: { id: string }) => a.id)).toEqual([pendingId]);

      const delCoach = await app.http("delete", "/users/me", c.token.coachB).send({ confirmation: "ELIMINAR" });
      expect([200, 204]).toContain(delCoach.status);
      expect(await app.prisma.team.count({ where: { id: team } })).toBe(0);
      expect(await app.prisma.teamMember.count({ where: { teamId: team } })).toBe(0);
      // El atleta de ese coach no se toca.
      expect(await app.prisma.user.count({ where: { id: c.userId.athleteB } })).toBe(1);
    });
  });
});
