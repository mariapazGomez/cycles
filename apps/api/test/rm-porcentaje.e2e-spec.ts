import { resetDatabase, startApp, type TestApp } from "./support/app";
import { seedScenario, type Scenario } from "./support/seed";

// RM del atleta por ejercicio y carga como % del RM (CYC-306).

describe("RM del atleta y % del RM", () => {
  let app: TestApp;
  let c: Scenario;
  const rmPath = (athleteId: string, exerciseId?: string) => `/athletes/${athleteId}/rm${exerciseId ? `/${exerciseId}` : ""}`;
  const record = (token: string, athleteId: string, exerciseId: string, body: object) => app.http("post", rmPath(athleteId, exerciseId), token).send(body);
  const setPercent = (token: string, sessionExerciseId: string, body: object) => app.http("patch", `/session-exercises/${sessionExerciseId}`, token).send(body);

  beforeAll(async () => {
    app = await startApp();
    await resetDatabase(app.prisma);
    c = await seedScenario(app);
  });
  afterAll(async () => {
    await app?.close();
  });

  describe("permisos (R5)", () => {
    it("sin sesión da 401", async () => {
      expect((await app.http("get", rmPath(c.userId.athleteA))).status).toBe(401);
      expect((await app.http("get", "/me/rm")).status).toBe(401);
    });
    it("el coach de otro atleta y el coach con relación terminada no leen ni escriben (403)", async () => {
      expect((await app.http("get", rmPath(c.userId.athleteA), c.token.coachB)).status).toBe(403);
      expect((await record(c.token.coachB, c.userId.athleteA, c.globalExercise, { weightKg: 100 })).status).toBe(403);
      expect((await app.http("get", rmPath(c.userId.athleteC), c.token.coachA)).status).toBe(403);
      expect((await record(c.token.coachA, c.userId.athleteC, c.globalExercise, { weightKg: 100 })).status).toBe(403);
    });
    it("el atleta no escribe RM todavía ni usa las rutas del coach", async () => {
      expect((await record(c.token.athleteA, c.userId.athleteA, c.globalExercise, { weightKg: 100 })).status).toBe(403);
      expect((await app.http("get", rmPath(c.userId.athleteA), c.token.athleteA)).status).toBe(403);
    });
    it("un coach no puede usar un ejercicio propio de otro coach", async () => {
      expect((await record(c.token.coachA, c.userId.athleteA, c.exerciseB, { weightKg: 100 })).status).toBe(404);
    });
  });

  describe("registro e historial", () => {
    it("valida el peso y la fecha", async () => {
      for (const body of [{ weightKg: 0 }, { weightKg: -5 }, { weightKg: 5000 }, { weightKg: "mucho" }, {}]) {
        expect((await record(c.token.coachA, c.userId.athleteA, c.globalExercise, body)).status).toBe(400);
      }
      const future = new Date(Date.now() + 5 * 86_400_000).toISOString();
      expect((await record(c.token.coachA, c.userId.athleteA, c.globalExercise, { weightKg: 100, measuredAt: future })).status).toBe(400);
    });

    it("sin RM, el ejercicio aparece en «sin RM» (está en su plan) y no en «con RM»", async () => {
      const res = await app.http("get", rmPath(c.userId.athleteA), c.token.coachA);
      expect(res.status).toBe(200);
      expect(res.body.withMax).toEqual([]);
      expect(res.body.withoutMax.map((e: { exerciseId: string }) => e.exerciseId)).toEqual([c.globalExercise]);
    });

    it("el vigente es el de fecha más reciente, no el último que se ingresó", async () => {
      const first = await record(c.token.coachA, c.userId.athleteA, c.globalExercise, { weightKg: 100, measuredAt: "2026-10-01" });
      expect(first.status).toBe(201);
      expect(first.body).toMatchObject({ weightKg: 100, source: "coach" });
      await record(c.token.coachA, c.userId.athleteA, c.globalExercise, { weightKg: 90, measuredAt: "2026-08-01" });
      const detail = await app.http("get", rmPath(c.userId.athleteA, c.globalExercise), c.token.coachA);
      expect(detail.body.current.weightKg).toBe(100);
      expect(detail.body.history.map((h: { weightKg: number }) => h.weightKg)).toEqual([100, 90]);
      const list = await app.http("get", rmPath(c.userId.athleteA), c.token.coachA);
      expect(list.body.withMax).toHaveLength(1);
      expect(list.body.withoutMax).toEqual([]);
    });

    it("el máximo levantado en series sale por ejercicio, de solo lectura, y no toca el RM", async () => {
      await app.http("post", `/session-exercises/${c.seA}/logs`, c.token.athleteA).send({ id: "00000000-0000-4000-8000-0000000000b1", setNumber: 1, actualReps: 3, actualWeight: 125 });
      const list = await app.http("get", rmPath(c.userId.athleteA), c.token.coachA);
      expect(list.body.withMax[0].maxLifted).toMatchObject({ weightKg: 125, reps: 3 });
      expect(list.body.withMax[0].weightKg).toBe(100);
      await app.prisma.$executeRaw`SELECT set_config('cycles.allow_purge', 'on', false)`;
      await app.prisma.exerciseLog.deleteMany({ where: { sessionExerciseId: c.seA } });
    });

    it("el atleta ve sus RM y no los de otro", async () => {
      const mine = await app.http("get", "/me/rm", c.token.athleteA);
      expect(mine.body.withMax[0]).toMatchObject({ exerciseId: c.globalExercise, weightKg: 100 });
      const other = await app.http("get", "/me/rm", c.token.athleteB);
      expect(other.body.withMax).toEqual([]);
    });

    it("lo levantado en series NO es el RM: aparece aparte como referencia", async () => {
      const log = await app
        .http("post", `/session-exercises/${c.seA}/logs`, c.token.athleteA)
        .send({ id: "00000000-0000-4000-8000-0000000000a1", setNumber: 1, actualReps: 5, actualWeight: 120 });
      expect(log.status).toBe(201);
      const detail = await app.http("get", rmPath(c.userId.athleteA, c.globalExercise), c.token.coachA);
      expect(detail.body.maxLiftedKg).toBe(120);
      expect(detail.body.current.weightKg).toBe(100);
      // Se limpia para que la siguiente prueba parta de una sesión sin series.
      await app.prisma.$executeRaw`SELECT set_config('cycles.allow_purge', 'on', false)`;
      await app.prisma.exerciseLog.deleteMany({ where: { sessionExerciseId: c.seA } });
    });
  });

  describe("% del RM en la sesión", () => {
    it("sin RM en ese ejercicio no se puede guardar un %", async () => {
      // athleteB (coachB) no tiene RM en el ejercicio de su sesión.
      const res = await setPercent(c.token.coachB, c.seB, { targetPercentRm: 80 });
      expect(res.status).toBe(422);
      expect(res.body.message).toContain("no tiene RM");
      expect(res.body.missing).toEqual([{ exerciseId: c.globalExercise, name: "Sentadilla e2e" }]);
      const add = await app.http("post", `/sessions/${c.sB}/exercises`, c.token.coachB).send({ exerciseId: c.globalExercise, targetSets: 3, targetReps: 5, targetPercentRm: 70 });
      expect(add.status).toBe(422);
    });

    it("con RM guarda el % y la API calcula el peso (redondeo a 2,5 kg)", async () => {
      const res = await setPercent(c.token.coachA, c.seA, { targetPercentRm: 77 });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ targetPercentRm: 77, targetWeight: null, rmStatus: "ok", resolvedWeightKg: 77.5 });
      const detail = await app.http("get", `/sessions/${c.sA}`, c.token.coachA);
      expect(detail.body.sessionExercises[0]).toMatchObject({ rmStatus: "ok", resolvedWeightKg: 77.5 });
    });

    it("rechaza % fuera de 1–100 y % con peso fijo a la vez; poner un peso fijo quita el %", async () => {
      for (const targetPercentRm of [0, 101, 55.5]) {
        expect((await setPercent(c.token.coachA, c.seA, { targetPercentRm })).status).toBe(400);
      }
      expect((await setPercent(c.token.coachA, c.seA, { targetPercentRm: 80, targetWeight: 60 })).status).toBe(400);
      const fixed = await setPercent(c.token.coachA, c.seA, { targetWeight: 60 });
      expect(fixed.body).toMatchObject({ targetWeight: 60, targetPercentRm: null, rmStatus: null, resolvedWeightKg: null });
      const back = await setPercent(c.token.coachA, c.seA, { targetPercentRm: 80 });
      expect(back.body).toMatchObject({ targetWeight: null, targetPercentRm: 80, resolvedWeightKg: 80 });
      const cleared = await setPercent(c.token.coachA, c.seA, { targetPercentRm: null });
      expect(cleared.body).toMatchObject({ targetPercentRm: null, rmStatus: null });
      await setPercent(c.token.coachA, c.seA, { targetPercentRm: 80 });
    });

    it("la base también impide % y peso fijo a la vez", async () => {
      await expect(app.prisma.sessionExercise.update({ where: { id: c.seA }, data: { targetWeight: 50 } })).rejects.toThrow();
    });

    it("el atleta ve el peso calculado en Hoy", async () => {
      const today = await app.http("get", "/me/today", c.token.athleteA);
      expect(today.status).toBe(200);
      const ex = today.body.session.sessionExercises.find((e: { id: string }) => e.id === c.seA);
      expect(ex).toMatchObject({ targetPercentRm: 80, rmStatus: "ok", resolvedWeightKg: 80 });
    });

    it("un RM nuevo recalcula lo pendiente; tras la primera serie el peso queda congelado", async () => {
      await record(c.token.coachA, c.userId.athleteA, c.globalExercise, { weightKg: 110, measuredAt: "2026-11-15" });
      const before = await app.http("get", `/sessions/${c.sA}`, c.token.coachA);
      expect(before.body.sessionExercises[0].resolvedWeightKg).toBe(87.5); // 88 → 87,5

      await app.http("post", `/session-exercises/${c.seA}/logs`, c.token.athleteA).send({ id: "00000000-0000-4000-8000-0000000000a2", setNumber: 1, actualReps: 5, actualWeight: 87.5 });
      expect((await app.prisma.sessionExercise.findUniqueOrThrow({ where: { id: c.seA } })).frozenRmKg).toBe(110);

      await record(c.token.coachA, c.userId.athleteA, c.globalExercise, { weightKg: 130, measuredAt: "2026-11-18" });
      const after = await app.http("get", `/sessions/${c.sA}`, c.token.coachA);
      expect(after.body.sessionExercises[0].resolvedWeightKg).toBe(87.5); // sigue con el RM de 110
    });

    it("el coach no cambia la carga de un atleta con relación terminada", async () => {
      expect((await setPercent(c.token.coachA, c.seC, { targetPercentRm: 80 })).status).toBe(403);
    });
  });

  describe("rutinas", () => {
    let routineId: string;
    const body = (exercises: object[]) => ({ name: "Rutina con %", exercises });

    it("una rutina guarda % sin atleta; con peso fijo a la vez da 400", async () => {
      const both = await app.http("post", "/routines", c.token.coachA).send(body([{ exerciseId: c.globalExercise, defaultSets: 3, defaultReps: 5, defaultWeight: 50, defaultPercentRm: 70 }]));
      expect(both.status).toBe(400);
      const res = await app.http("post", "/routines", c.token.coachA).send(
        body([
          { exerciseId: c.globalExercise, defaultSets: 3, defaultReps: 5, defaultPercentRm: 70 },
          { exerciseId: c.exerciseA, defaultSets: 3, defaultReps: 8, defaultPercentRm: 60 },
        ]),
      );
      expect(res.status).toBe(201);
      routineId = res.body.id;
      expect(res.body.routineExercises.map((e: { defaultPercentRm: number }) => e.defaultPercentRm)).toEqual([70, 60]);
    });

    const notices = () => app.prisma.notification.findMany({ where: { userId: c.userId.coachA, type: "rm_missing" } });
    const addRoutine = (cycleId: string) => {
      const today = new Date().toISOString().slice(0, 10);
      return app.http("post", `/cycles/${cycleId}/sessions`, c.token.coachA).send({ routineId, scheduledDate: today, today });
    };

    it("al agregarla a un atleta sin RM en un ejercicio crea la sesión con el % y sin peso, y avisa al coach", async () => {
      const res = await addRoutine(c.cycleA);
      expect(res.status).toBe(201);
      const [withRm, withoutRm] = res.body.sessionExercises;
      expect(withRm).toMatchObject({ exerciseId: c.globalExercise, targetPercentRm: 70, rmStatus: "ok" });
      expect(withoutRm).toMatchObject({ exerciseId: c.exerciseA, targetPercentRm: 60, targetWeight: null, rmStatus: "missing", resolvedWeightKg: null });
      await new Promise((r) => setTimeout(r, 200));
      const [notice] = await notices();
      expect(notice).toMatchObject({ groupKey: `rm_missing:${c.userId.athleteA}`, readAt: null });
      // Solo nombres: sin pesos ni porcentajes ni salud (R7).
      expect(notice.payload).toEqual({ athleteId: c.userId.athleteA, athleteName: "Atleta A", exerciseNames: ["Ejercicio de A"], missingCount: 1 });
    });

    it("al registrar el RM que faltaba, el aviso se cierra y el peso aparece", async () => {
      const saved = await record(c.token.coachA, c.userId.athleteA, c.exerciseA, { weightKg: 50 });
      expect(saved.status).toBe(201);
      await new Promise((r) => setTimeout(r, 200));
      expect((await notices())[0].readAt).not.toBeNull();
      const res = await addRoutine(c.cycleA);
      expect(res.body.sessionExercises[1]).toMatchObject({ exerciseId: c.exerciseA, targetPercentRm: 60, rmStatus: "ok", resolvedWeightKg: 30 });
    });

    it("la misma rutina para varios atletas: una sesión por ciclo y el resultado de cada uno", async () => {
      const today = new Date().toISOString().slice(0, 10);
      const res = await app
        .http("post", "/sessions/batch", c.token.coachA)
        .send({ routineId, cycleIds: [c.cycleA, c.cycleC, c.cycleB], scheduledDate: today, today });
      expect(res.status).toBe(201);
      const byCycle = new Map<string, { ok: boolean; error?: string }>(res.body.results.map((r: { cycleId: string; ok: boolean; error?: string }) => [r.cycleId, r]));
      expect(byCycle.get(c.cycleA)?.ok).toBe(true);
      expect(byCycle.get(c.cycleC)?.ok).toBe(false); // relación terminada
      expect(byCycle.get(c.cycleB)?.ok).toBe(false); // ciclo de otro coach
      expect((await app.http("post", "/sessions/batch", c.token.athleteA).send({ routineId, cycleIds: [c.cycleA], scheduledDate: today })).status).toBe(403);
    });
  });

  describe("RM aproximado (estimated)", () => {
    it("el coach guarda un RM aproximado como source=estimated; nada más lo crea", async () => {
      const res = await record(c.token.coachA, c.userId.athleteA, c.globalExercise, { weightKg: 105, source: "estimated", measuredAt: "2026-11-19" });
      expect(res.status).toBe(201);
      expect(res.body.source).toBe("estimated");
      expect((await record(c.token.coachA, c.userId.athleteA, c.globalExercise, { weightKg: 100, source: "athlete" })).status).toBe(400);
    });

    it("basedOnLogId solo con estimated y de una serie del mismo atleta y ejercicio", async () => {
      await app.http("post", `/session-exercises/${c.seB}/logs`, c.token.athleteB).send({ id: "00000000-0000-4000-8000-0000000000c1", setNumber: 1, actualReps: 5, actualWeight: 80 });
      const other = { weightKg: 90, source: "estimated", basedOnLogId: "00000000-0000-4000-8000-0000000000c1" };
      expect((await record(c.token.coachA, c.userId.athleteA, c.globalExercise, other)).status).toBe(400); // serie de otro atleta
      expect((await record(c.token.coachA, c.userId.athleteA, c.globalExercise, { weightKg: 90, basedOnLogId: "x" })).status).toBe(400); // sin estimated
    });
  });

  describe("borrado de cuenta", () => {
    it("los RM del atleta se eliminan con su cuenta", async () => {
      expect(await app.prisma.athleteMax.count({ where: { athleteId: c.userId.athleteA } })).toBeGreaterThan(0);
      const res = await app.http("delete", "/users/me", c.token.athleteA).send({ confirmation: "ELIMINAR" });
      // La ruta y el cuerpo exactos los define UsersController; si cambian, esta prueba lo dirá.
      expect([200, 204]).toContain(res.status);
      expect(await app.prisma.athleteMax.count({ where: { athleteId: c.userId.athleteA } })).toBe(0);
    });
  });
});
