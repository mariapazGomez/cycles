import { resetDatabase, startApp, type TestApp } from "./support/app";
import { seedScenario, type Scenario } from "./support/seed";

// Desasignar y eliminar ciclos. Desasignar quita el ciclo de un atleta y deja la
// plantilla en la Biblioteca; eliminar borra la plantilla y la quita de todos sus
// atletas. Con series o cierres del atleta el ciclo se archiva en vez de borrarse.

describe("Desasignar y eliminar ciclos", () => {
  let app: TestApp;
  let c: Scenario;
  const today = () => new Date().toISOString().slice(0, 10);

  const newTemplate = () =>
    app.prisma.trainingCycle.create({
      data: {
        coachId: c.userId.coachA,
        name: "Plantilla e2e",
        isTemplate: true,
        templateWeeks: 4,
        cycleType: "mesocycle",
        sessionsPerWeek: 3,
        startDate: new Date(Date.UTC(2001, 0, 1)),
        endDate: new Date(Date.UTC(2001, 0, 28)),
      },
    });

  // Asigna la plantilla a la atleta A y le pone una sesión con un ejercicio.
  async function assignCopy(templateId: string) {
    const res = await app.http("post", `/cycles/${templateId}/assign`, c.token.coachA).send({ athleteId: c.userId.athleteA, startDate: today() });
    expect(res.status).toBe(201);
    const session = await app.prisma.trainingSession.create({
      data: { cycleId: res.body.id, name: "Sesión", weekNumber: 1, slotNumber: 1 },
    });
    const sessionExercise = await app.prisma.sessionExercise.create({
      data: { sessionId: session.id, exerciseId: c.globalExercise, orderIndex: 1, targetSets: 3, targetReps: 8 },
    });
    return { cycleId: res.body.id as string, sessionId: session.id, sessionExerciseId: sessionExercise.id };
  }

  const logSet = (sessionExerciseId: string) =>
    app.prisma.exerciseLog.create({ data: { sessionExerciseId, athleteId: c.userId.athleteA, setNumber: 1, actualReps: 8, actualWeight: 40 } });

  const exists = async (id: string) => (await app.prisma.trainingCycle.findUnique({ where: { id } })) !== null;

  beforeAll(async () => {
    app = await startApp();
    await resetDatabase(app.prisma);
    c = await seedScenario(app);
  });
  afterAll(async () => {
    await app?.close();
  });

  describe("desasignar", () => {
    it("quita el ciclo del atleta y la plantilla sigue en la Biblioteca", async () => {
      const template = await newTemplate();
      const copy = await assignCopy(template.id);
      const other = await assignCopy(template.id);

      const res = await app.http("post", `/cycles/${copy.cycleId}/unassign`, c.token.coachA);
      expect(res.status).toBe(201);
      expect(res.body.result).toBe("deleted");
      expect(await exists(copy.cycleId)).toBe(false);
      expect(await app.prisma.trainingSession.count({ where: { cycleId: copy.cycleId } })).toBe(0);
      // La plantilla y la copia de otro atleta no se tocan.
      expect(await exists(template.id)).toBe(true);
      expect(await exists(other.cycleId)).toBe(true);
    });

    it("con series registradas lo archiva y conserva el historial", async () => {
      const template = await newTemplate();
      const copy = await assignCopy(template.id);
      await logSet(copy.sessionExerciseId);

      const res = await app.http("post", `/cycles/${copy.cycleId}/unassign`, c.token.coachA);
      expect(res.body.result).toBe("archived");
      expect((await app.prisma.trainingCycle.findUniqueOrThrow({ where: { id: copy.cycleId } })).status).toBe("archived");
      expect(await app.prisma.exerciseLog.count({ where: { sessionExerciseId: copy.sessionExerciseId } })).toBe(1);
    });

    it("no desasigna una plantilla, un ciclo ajeno ni uno ya terminado", async () => {
      const template = await newTemplate();
      expect((await app.http("post", `/cycles/${template.id}/unassign`, c.token.coachA)).status).toBe(400);
      expect([403, 404]).toContain((await app.http("post", `/cycles/${c.cycleA}/unassign`, c.token.coachB)).status);
      expect((await app.http("post", `/cycles/${c.cycleA}/unassign`, c.token.athleteA)).status).toBe(403);

      const done = await assignCopy(template.id);
      await app.prisma.trainingCycle.update({ where: { id: done.cycleId }, data: { status: "completed" } });
      expect((await app.http("post", `/cycles/${done.cycleId}/unassign`, c.token.coachA)).status).toBe(409);
      expect(await exists(done.cycleId)).toBe(true);
    });
  });

  describe("eliminar", () => {
    it("borra la plantilla y la quita de todos los atletas", async () => {
      const template = await newTemplate();
      const one = await assignCopy(template.id);
      const two = await assignCopy(template.id);

      const impact = await app.http("get", `/cycles/templates/${template.id}/impact`, c.token.coachA);
      expect(impact.status).toBe(200);
      expect(impact.body.athletes).toHaveLength(2);

      const res = await app.http("delete", `/cycles/templates/${template.id}`, c.token.coachA);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ unassigned: 2, archived: 0 });
      for (const id of [template.id, one.cycleId, two.cycleId]) expect(await exists(id)).toBe(false);
    });

    it("la copia con registros se archiva, las completadas quedan de historial y la plantilla se va", async () => {
      const template = await newTemplate();
      const withLogs = await assignCopy(template.id);
      await logSet(withLogs.sessionExerciseId);
      const clean = await assignCopy(template.id);
      const finished = await assignCopy(template.id);
      await app.prisma.trainingCycle.update({ where: { id: finished.cycleId }, data: { status: "completed" } });

      const res = await app.http("delete", `/cycles/templates/${template.id}`, c.token.coachA);
      expect(res.body).toEqual({ unassigned: 1, archived: 1 });
      expect(await exists(template.id)).toBe(false);
      expect(await exists(clean.cycleId)).toBe(false);

      const archived = await app.prisma.trainingCycle.findUniqueOrThrow({ where: { id: withLogs.cycleId } });
      expect(archived.status).toBe("archived");
      expect(archived.templateId).toBeNull();
      const kept = await app.prisma.trainingCycle.findUniqueOrThrow({ where: { id: finished.cycleId } });
      expect(kept.status).toBe("completed");
      expect(kept.templateId).toBeNull();
    });

    it("solo el coach dueño y solo plantillas", async () => {
      const template = await newTemplate();
      expect([403, 404]).toContain((await app.http("delete", `/cycles/templates/${template.id}`, c.token.coachB)).status);
      expect((await app.http("delete", `/cycles/templates/${template.id}`, c.token.athleteA)).status).toBe(403);
      expect((await app.http("delete", `/cycles/templates/${c.cycleA}`, c.token.coachA)).status).toBe(400);
      expect(await exists(template.id)).toBe(true);
      expect(await exists(c.cycleA)).toBe(true);
    });
  });
});
