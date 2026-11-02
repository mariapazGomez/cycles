import { randomUUID } from "crypto";
import { resetDatabase, startApp, type TestApp } from "./support/app";
import { seedScenario, type Scenario } from "./support/seed";

// ExerciseLog y SessionFeedback son un registro histórico (SEGURIDAD.md, R7 y
// S-12): la base misma impide editarlos o borrarlos, salvo anular una fila
// (active 1 → 0) o declarar la excepción dentro de una transacción.

describe("Registros históricos: solo se agregan", () => {
  let app: TestApp;
  let c: Scenario;
  let logId: string;
  let feedbackId: string;

  const prisma = () => app.prisma;
  const rejected = async (run: () => Promise<unknown>) => {
    await expect(run()).rejects.toThrow(/registro histórico/);
  };

  beforeAll(async () => {
    app = await startApp();
    await resetDatabase(app.prisma);
    c = await seedScenario(app);
    const log = await prisma().exerciseLog.create({
      data: { id: randomUUID(), sessionExerciseId: c.seB, athleteId: c.userId.athleteB, setNumber: 1, actualReps: 8, actualWeight: 60 },
    });
    logId = log.id;
    const feedback = await prisma().sessionFeedback.create({
      data: { sessionId: c.sB, athleteId: c.userId.athleteB, outcome: "completed", srpe: 6, durationMinutes: 45, notes: "bien" },
    });
    feedbackId = feedback.id;
  });
  afterAll(async () => {
    await app?.close();
  });

  describe("editar", () => {
    it("no deja cambiar el contenido de una serie ni de un cierre", async () => {
      await rejected(() => prisma().exerciseLog.update({ where: { id: logId }, data: { actualReps: 20 } }));
      await rejected(() => prisma().exerciseLog.update({ where: { id: logId }, data: { actualWeight: 200 } }));
      await rejected(() => prisma().sessionFeedback.update({ where: { id: feedbackId }, data: { notes: "otra cosa" } }));
      await rejected(() => prisma().sessionFeedback.update({ where: { id: feedbackId }, data: { srpe: 1 } }));
    });

    it("tampoco con SQL directo, como en la consola de la base", async () => {
      await rejected(() => prisma().$executeRawUnsafe(`UPDATE "ExerciseLog" SET "actualReps" = 99`));
      await rejected(() => prisma().$executeRawUnsafe(`UPDATE "SessionFeedback" SET "pain" = true`));
    });

    it("no deja reactivar una fila anulada ni anular y cambiar otra cosa a la vez", async () => {
      await rejected(() => prisma().exerciseLog.update({ where: { id: logId }, data: { active: 0, actualReps: 1 } }));
      await prisma().exerciseLog.update({ where: { id: logId }, data: { active: 0 } });
      await rejected(() => prisma().exerciseLog.update({ where: { id: logId }, data: { active: 1 } }));
      // Se deja como estaba para las pruebas siguientes.
      await prisma().$transaction([
        prisma().$executeRaw`SELECT set_config('cycles.allow_purge', 'on', true)`,
        prisma().$executeRaw`UPDATE "ExerciseLog" SET "active" = 1 WHERE id = ${logId}`,
      ]);
    });

    it("anular una fila (active 1 a 0) sí se puede, y un UPDATE sin cambios también", async () => {
      await prisma().sessionFeedback.update({ where: { id: feedbackId }, data: { active: 0 } });
      expect((await prisma().sessionFeedback.findUniqueOrThrow({ where: { id: feedbackId } })).active).toBe(0);
      await prisma().sessionFeedback.update({ where: { id: feedbackId }, data: { notes: "bien" } }); // mismo valor
      await prisma().$transaction([
        prisma().$executeRaw`SELECT set_config('cycles.allow_purge', 'on', true)`,
        prisma().$executeRaw`UPDATE "SessionFeedback" SET "active" = 1 WHERE id = ${feedbackId}`,
      ]);
    });
  });

  describe("borrar y vaciar", () => {
    it("no deja borrar filas, ni una ni todas", async () => {
      await rejected(() => prisma().exerciseLog.delete({ where: { id: logId } }));
      await rejected(() => prisma().sessionFeedback.deleteMany({}));
      await rejected(() => prisma().$executeRawUnsafe(`DELETE FROM "ExerciseLog"`));
    });

    it("no deja vaciar las tablas, tampoco en cascada desde una tabla padre", async () => {
      await rejected(() => prisma().$executeRawUnsafe(`TRUNCATE TABLE "ExerciseLog"`));
      await rejected(() => prisma().$executeRawUnsafe(`TRUNCATE TABLE "TrainingSession" CASCADE`));
      await rejected(() => prisma().$executeRawUnsafe(`TRUNCATE TABLE "User" CASCADE`));
    });

    it("el error dice qué hacer", async () => {
      await expect(prisma().$executeRawUnsafe(`DELETE FROM "ExerciseLog"`)).rejects.toThrow(/cycles\.allow_purge/);
    });

    it("la excepción vale solo dentro de su transacción", async () => {
      const extra = await prisma().exerciseLog.create({
        data: { id: randomUUID(), sessionExerciseId: c.seB, athleteId: c.userId.athleteB, setNumber: 2, actualReps: 5 },
      });
      await prisma().$transaction([
        prisma().$executeRaw`SELECT set_config('cycles.allow_purge', 'on', true)`,
        prisma().$executeRaw`DELETE FROM "ExerciseLog" WHERE id = ${extra.id}`,
      ]);
      expect(await prisma().exerciseLog.findUnique({ where: { id: extra.id } })).toBeNull();
      // Fuera de la transacción vuelve a estar protegido.
      await rejected(() => prisma().$executeRawUnsafe(`DELETE FROM "ExerciseLog"`));
    });
  });

  describe("lo que la app necesita sigue funcionando", () => {
    it("registrar, cerrar y reabrir una sesión (anula, no borra)", async () => {
      const ok = (s: number) => expect(s).toBeLessThan(300);
      ok((await app.http("post", `/sessions/${c.sA}/start`, c.token.athleteA)).status);
      ok((await app.http("post", `/session-exercises/${c.seA}/logs`, c.token.athleteA).send({ id: randomUUID(), setNumber: 1, actualReps: 8 })).status);
      ok((await app.http("post", `/sessions/${c.sA}/feedback`, c.token.athleteA).send({ outcome: "completed", srpe: 5, durationMinutes: 30 })).status);
      ok((await app.http("post", `/sessions/${c.sA}/reopen`, c.token.athleteA)).status);

      const logs = await prisma().exerciseLog.findMany({ where: { athleteId: c.userId.athleteA } });
      const feedback = await prisma().sessionFeedback.findMany({ where: { athleteId: c.userId.athleteA } });
      expect(logs).toHaveLength(1);
      expect(logs.every((l) => l.active === 0)).toBe(true);
      expect(feedback).toHaveLength(1);
      expect(feedback.every((f) => f.active === 0)).toBe(true);
    });

    it("eliminar la cuenta de un atleta borra todo su historial", async () => {
      const before = await prisma().exerciseLog.count({ where: { athleteId: c.userId.athleteA } });
      expect(before).toBeGreaterThan(0);
      const res = await app.http("delete", "/users/me", c.token.athleteA).send({ confirmation: "ELIMINAR" });
      expect(res.status).toBe(204);
      expect(await prisma().exerciseLog.count({ where: { athleteId: c.userId.athleteA } })).toBe(0);
      expect(await prisma().sessionFeedback.count({ where: { athleteId: c.userId.athleteA } })).toBe(0);
      expect(await prisma().user.findUnique({ where: { id: c.userId.athleteA } })).toBeNull();
      // El historial de otra persona no se tocó.
      expect(await prisma().exerciseLog.count({ where: { athleteId: c.userId.athleteB } })).toBeGreaterThan(0);
    });
  });
});
