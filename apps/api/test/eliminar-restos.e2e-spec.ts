import { KEPT_TEMPLATE_NAME } from "../src/users/account.service";
import { PASSWORD, passwordHash, resetDatabase, startApp, type TestApp } from "./support/app";

// Lo que no debe quedar al eliminar una cuenta (decidido el 26-11): avisos ajenos
// que la nombran, texto libre en la plantilla que queda al coach y ejercicios
// propios del coach que nada usa.

const DAY = 86_400_000;

describe("Eliminar la cuenta no deja restos", () => {
  let app: TestApp;
  beforeAll(async () => {
    app = await startApp();
  });
  beforeEach(async () => {
    await resetDatabase(app.prisma);
  });
  afterAll(async () => {
    await app.close();
  });

  const mk = async (email: string, name: string, role: "coach" | "athlete") =>
    app.prisma.user.create({ data: { email, name, role, passwordHash: await passwordHash(), emailVerifiedAt: new Date() } });
  const remove = async (email: string) => {
    const login = await app.http("post", "/auth/login").send({ email, password: PASSWORD });
    expect((await app.http("delete", "/users/me", login.body.accessToken).send({ confirmation: "ELIMINAR" })).status).toBe(204);
  };
  const plan = (coachId: string, athleteId: string, name: string) =>
    app.prisma.trainingCycle.create({
      data: { coachId, athleteId, name, objective: `Objetivo de ${name}`, startDate: new Date(), endDate: new Date(Date.now() + 20 * DAY) },
    });
  const notice = (userId: string, type: "session_logged" | "rm_missing" | "plan_assigned", payload: Record<string, string>, planId?: string) =>
    app.prisma.notification.create({ data: { userId, type, groupKey: `${type}:${Math.random()}`, planId, payload, visibleAt: new Date() } });

  async function team() {
    const coach = await mk("coach@e2e.test", "Coach Uno", "coach");
    const ana = await mk("ana@e2e.test", "Ana", "athlete");
    const beto = await mk("beto@e2e.test", "Beto", "athlete");
    await app.prisma.coachAthlete.createMany({
      data: [ana, beto].map((a) => ({ coachId: coach.id, athleteId: a.id, status: "active" as const })),
    });
    return { coach, ana, beto, planAna: await plan(coach.id, ana.id, "Plan de Ana"), planBeto: await plan(coach.id, beto.id, "Plan de Beto") };
  }

  it("atleta: se van los avisos del coach que lo nombran (también los sin plan) y quedan los de otros", async () => {
    const { coach, ana, beto, planAna, planBeto } = await team();
    await notice(coach.id, "session_logged", { athleteId: ana.id, athleteName: "Ana" }, planAna.id);
    await notice(coach.id, "rm_missing", { athleteId: ana.id, athleteName: "Ana" });
    await notice(coach.id, "session_logged", { athleteId: beto.id, athleteName: "Beto" }, planBeto.id);

    await remove(ana.email);

    const left = await app.prisma.notification.findMany();
    expect(left.map((n) => (n.payload as { athleteName: string }).athleteName)).toEqual(["Beto"]);
  });

  it("atleta: la plantilla que queda al coach lleva nombre genérico y sin objetivo", async () => {
    const { ana } = await team();
    await remove(ana.email);
    const templates = await app.prisma.trainingCycle.findMany({ where: { isTemplate: true } });
    expect(templates).toHaveLength(1);
    expect(templates[0]).toMatchObject({ name: KEPT_TEMPLATE_NAME, objective: null, athleteId: null });
    expect(JSON.stringify(templates)).not.toContain("Ana");
  });

  it("coach: se van los avisos de sus atletas y los suyos; queda el de otro coach", async () => {
    const { coach, ana, beto, planAna } = await team();
    const other = await mk("otro@e2e.test", "Coach Dos", "coach");
    const otherPlan = await plan(other.id, beto.id, "Plan del otro");
    await notice(ana.id, "plan_assigned", { coachName: "Coach Uno" }, planAna.id);
    await notice(coach.id, "session_logged", { athleteId: ana.id, athleteName: "Ana" }, planAna.id);
    await notice(beto.id, "plan_assigned", { coachName: "Coach Dos" }, otherPlan.id);

    await remove(coach.email);

    const left = await app.prisma.notification.findMany();
    expect(left.map((n) => (n.payload as { coachName: string }).coachName)).toEqual(["Coach Dos"]);
  });

  it("coach: borra sus ejercicios sin uso y oculta los que usa un atleta (sesión o RM)", async () => {
    const { coach, ana, planAna } = await team();
    const make = (name: string) => app.prisma.exercise.create({ data: { name, muscleGroup: "back", createdBy: coach.id } });
    const [unused, inSession, inMax, onlyInRoutine] = [await make("Sin uso"), await make("En sesión"), await make("Con RM"), await make("Solo en su rutina")];
    const session = await app.prisma.trainingSession.create({ data: { cycleId: planAna.id, name: "S1", weekNumber: 1, slotNumber: 1 } });
    await app.prisma.sessionExercise.create({ data: { sessionId: session.id, exerciseId: inSession.id, orderIndex: 1, targetSets: 3, targetReps: 8 } });
    await app.prisma.athleteMax.create({ data: { athleteId: ana.id, exerciseId: inMax.id, weightKg: 80, measuredAt: new Date(), source: "athlete", recordedById: ana.id } });
    // La rutina del coach se borra con su cuenta, así que ya no cuenta como uso.
    await app.prisma.routine.create({
      data: { coachId: coach.id, name: "R", routineExercises: { create: { exerciseId: onlyInRoutine.id, orderIndex: 1, defaultSets: 3, defaultReps: 8 } } },
    });

    await remove(coach.email);

    const left = await app.prisma.exercise.findMany({ orderBy: { name: "asc" } });
    expect(left.map((e) => [e.id, e.isActive])).toEqual([
      [inMax.id, false],
      [inSession.id, false],
    ]);
    expect(left.map((e) => e.id)).not.toContain(unused.id);
  });
});
