import { resetDatabase, startApp, type TestApp } from "./support/app";
import { seedScenario, type Scenario } from "./support/seed";

// Historial por ejercicio del atleta (CYC-239): GET /me/exercise-progress.

const DAY = 86_400_000;

describe("Historial por ejercicio (GET /me/exercise-progress)", () => {
  let app: TestApp;
  let c: Scenario;
  const progress = (token: string) => app.http("get", "/me/exercise-progress", token);

  // Agrega una sesión más del ejercicio de la sesión base de un atleta, con sus series.
  async function addSession(athleteId: string, cycleId: string, slot: number, exerciseId: string, sets: Array<[number, number | null]>, daysAgo: number, note?: string) {
    const session = await app.prisma.trainingSession.create({ data: { cycleId, name: `Extra ${slot}`, weekNumber: 1, slotNumber: slot, scheduledDate: new Date() } });
    const item = await app.prisma.sessionExercise.create({ data: { sessionId: session.id, exerciseId, orderIndex: 1, targetSets: 3, targetReps: 8, targetWeight: 80, targetRir: 2, note } });
    let n = 0;
    for (const [reps, weight] of sets) {
      n += 1;
      await app.prisma.exerciseLog.create({ data: { sessionExerciseId: item.id, athleteId, setNumber: n, actualReps: reps, actualWeight: weight, loggedAt: new Date(Date.now() - daysAgo * DAY) } });
    }
    return session.id;
  }

  beforeAll(async () => {
    app = await startApp();
    await resetDatabase(app.prisma);
    c = await seedScenario(app);
  });
  afterAll(async () => {
    await app?.close();
  });

  it("sin historial devuelve una lista vacía", async () => {
    const res = await progress(c.token.athleteA);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ exercises: [] });
  });

  it("un ejercicio hecho en una sola sesión no aparece; con dos sí, con promedios y series", async () => {
    await addSession(c.userId.athleteA, c.cycleA, 2, c.globalExercise, [[8, 80], [8, 80], [6, 80]], 14, "dolor de rodilla");
    expect((await progress(c.token.athleteA)).body.exercises).toEqual([]);
    await addSession(c.userId.athleteA, c.cycleA, 3, c.globalExercise, [[8, 85], [8, 85]], 7);
    const res = await progress(c.token.athleteA);
    expect(res.body.exercises).toHaveLength(1);
    const [exercise] = res.body.exercises;
    expect(exercise.name).toBe("Sentadilla e2e");
    expect(exercise.sessions).toHaveLength(2);
    expect(exercise.sessions[0]).toMatchObject({ plannedWeight: 80, plannedReps: 8, actualWeight: 80, actualReps: 7.3 });
    expect(exercise.sessions[1]).toMatchObject({ actualWeight: 85, actualReps: 8 });
    expect(exercise.sessions[0].series).toHaveLength(3);
  });

  it("no incluye la nota del coach (puede mencionar salud)", async () => {
    const text = JSON.stringify((await progress(c.token.athleteA)).body);
    expect(text).not.toContain("dolor de rodilla");
    expect(text).not.toContain('"note"');
  });

  it("cada atleta ve solo su historial", async () => {
    await addSession(c.userId.athleteB, c.cycleB, 2, c.globalExercise, [[5, 100]], 10);
    await addSession(c.userId.athleteB, c.cycleB, 3, c.globalExercise, [[5, 105]], 3);
    const b = (await progress(c.token.athleteB)).body.exercises[0].sessions;
    expect(b.map((s: { actualWeight: number }) => s.actualWeight)).toEqual([100, 105]);
    const a = (await progress(c.token.athleteA)).body.exercises[0].sessions;
    expect(a.map((s: { actualWeight: number }) => s.actualWeight)).toEqual([80, 85]);
  });

  it("el atleta conserva su historial aunque su relación con el coach terminó", async () => {
    await addSession(c.userId.athleteC, c.cycleC, 2, c.globalExercise, [[8, 60]], 9);
    await addSession(c.userId.athleteC, c.cycleC, 3, c.globalExercise, [[8, 62.5]], 2);
    const res = await progress(c.token.athleteC);
    expect(res.status).toBe(200);
    expect(res.body.exercises[0].sessions).toHaveLength(2);
  });

  it("las series anuladas o reemplazadas no cuentan", async () => {
    const sessionId = await addSession(c.userId.athleteA, c.cycleA, 4, c.globalExercise, [[8, 90]], 1);
    await app.prisma.exerciseLog.updateMany({ where: { sessionExercise: { sessionId } }, data: { active: 0 } }).catch(() => undefined);
    const sessions = (await progress(c.token.athleteA)).body.exercises[0].sessions;
    expect(sessions.map((s: { sessionId: string }) => s.sessionId)).not.toContain(sessionId);
  });

  it("una sesión quitada o no hecha no cuenta", async () => {
    const quitada = await addSession(c.userId.athleteA, c.cycleA, 5, c.globalExercise, [[8, 95]], 1);
    await app.prisma.trainingSession.update({ where: { id: quitada }, data: { deletedAt: new Date() } });
    const omitida = await addSession(c.userId.athleteA, c.cycleA, 6, c.globalExercise, [[8, 96]], 1);
    await app.prisma.trainingSession.update({ where: { id: omitida }, data: { status: "skipped" } });
    const ids = (await progress(c.token.athleteA)).body.exercises[0].sessions.map((s: { sessionId: string }) => s.sessionId);
    expect(ids).not.toContain(quitada);
    expect(ids).not.toContain(omitida);
  });

  it("el coach y quien no tiene sesión no entran", async () => {
    expect((await progress(c.token.coachA)).status).toBe(403);
    expect((await app.http("get", "/me/exercise-progress")).status).toBe(401);
  });
});
