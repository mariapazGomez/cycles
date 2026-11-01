import type { PrismaService } from "../../src/prisma/prisma.service";
import { PASSWORD, passwordHash, type TestApp } from "./app";

// Escenario de autorización:
//
//   coachA ── activa ──► athleteA   cycleA (+ sesión sA, ejercicio de sesión seA)
//   coachA ── inactiva ► athleteC   cycleC (+ sC, seC)      ← relación terminada
//   coachB ── activa ──► athleteB   cycleB (+ sB, seB)
//
// coachA y coachB tienen cada uno su plantilla, su rutina y un ejercicio propio.
export type Who = "coachA" | "coachB" | "athleteA" | "athleteB" | "athleteC";

export interface Scenario {
  token: Record<Who, string>;
  userId: Record<Who, string>;
  cycleA: string;
  cycleB: string;
  cycleC: string;
  sA: string;
  sB: string;
  sC: string;
  seA: string;
  seB: string;
  seC: string;
  templateA: string;
  templateB: string;
  routineA: string;
  routineB: string;
  exerciseA: string;
  exerciseB: string;
  globalExercise: string;
  notificationB: string;
}

const DAY = 86_400_000;

export async function seedScenario(app: TestApp): Promise<Scenario> {
  const { prisma } = app;
  const hash = await passwordHash();
  const mk = (email: string, name: string, role: "coach" | "athlete") =>
    prisma.user.create({ data: { email, name, role, passwordHash: hash, emailVerifiedAt: new Date() } });

  const [coachA, coachB, athleteA, athleteB, athleteC] = await Promise.all([
    mk("coach.a@e2e.test", "Coach A", "coach"),
    mk("coach.b@e2e.test", "Coach B", "coach"),
    mk("atleta.a@e2e.test", "Atleta A", "athlete"),
    mk("atleta.b@e2e.test", "Atleta B", "athlete"),
    mk("atleta.c@e2e.test", "Atleta C", "athlete"),
  ]);
  const userId = {
    coachA: coachA.id,
    coachB: coachB.id,
    athleteA: athleteA.id,
    athleteB: athleteB.id,
    athleteC: athleteC.id,
  };

  await prisma.coachAthlete.createMany({
    data: [
      { coachId: coachA.id, athleteId: athleteA.id, status: "active" },
      { coachId: coachA.id, athleteId: athleteC.id, status: "inactive" },
      { coachId: coachB.id, athleteId: athleteB.id, status: "active" },
    ],
  });

  const startDate = new Date(Date.now() - 7 * DAY);
  const endDate = new Date(Date.now() + 28 * DAY);
  const globalExercise = await prisma.exercise.create({ data: { name: "Sentadilla e2e", muscleGroup: "legs", createdBy: null } });
  const exerciseA = await prisma.exercise.create({ data: { name: "Ejercicio de A", muscleGroup: "back", createdBy: coachA.id } });
  const exerciseB = await prisma.exercise.create({ data: { name: "Ejercicio de B", muscleGroup: "back", createdBy: coachB.id } });

  async function plan(coachId: string, athleteId: string, label: string) {
    const cycle = await prisma.trainingCycle.create({
      data: { coachId, athleteId, name: `Ciclo ${label}`, startDate, endDate, cycleType: "mesocycle", sessionsPerWeek: 3 },
    });
    const session = await prisma.trainingSession.create({
      data: { cycleId: cycle.id, name: `Sesión ${label}`, weekNumber: 1, slotNumber: 1, scheduledDate: new Date() },
    });
    const sessionExercise = await prisma.sessionExercise.create({
      data: { sessionId: session.id, exerciseId: globalExercise.id, orderIndex: 1, targetSets: 3, targetReps: 8 },
    });
    return { cycle: cycle.id, session: session.id, sessionExercise: sessionExercise.id };
  }
  const a = await plan(coachA.id, athleteA.id, "A");
  const b = await plan(coachB.id, athleteB.id, "B");
  const c = await plan(coachA.id, athleteC.id, "C");

  const template = (coachId: string, label: string) =>
    prisma.trainingCycle.create({
      data: {
        coachId,
        name: `Plantilla ${label}`,
        isTemplate: true,
        templateWeeks: 4,
        cycleType: "mesocycle",
        sessionsPerWeek: 3,
        startDate: new Date(Date.UTC(2001, 0, 1)),
        endDate: new Date(Date.UTC(2001, 0, 28)),
      },
    });
  const [templateA, templateB] = await Promise.all([template(coachA.id, "A"), template(coachB.id, "B")]);

  const routine = (coachId: string, label: string) =>
    prisma.routine.create({
      data: {
        coachId,
        name: `Rutina ${label}`,
        routineExercises: { create: [{ exerciseId: globalExercise.id, orderIndex: 1, defaultSets: 3, defaultReps: 8 }] },
      },
    });
  const [routineA, routineB] = await Promise.all([routine(coachA.id, "A"), routine(coachB.id, "B")]);

  await prisma.notification.create({
    data: { userId: athleteA.id, type: "plan_assigned", groupKey: "e2e-a", payload: {}, visibleAt: new Date() },
  });
  const notificationB = await prisma.notification.create({
    data: { userId: athleteB.id, type: "plan_assigned", groupKey: "e2e-b", payload: {}, visibleAt: new Date() },
  });

  const emails: Record<Who, string> = {
    coachA: "coach.a@e2e.test",
    coachB: "coach.b@e2e.test",
    athleteA: "atleta.a@e2e.test",
    athleteB: "atleta.b@e2e.test",
    athleteC: "atleta.c@e2e.test",
  };
  const token = {} as Record<Who, string>;
  for (const who of Object.keys(emails) as Who[]) {
    const res = await app.http("post", "/auth/login").send({ email: emails[who], password: PASSWORD });
    if (res.status !== 200 && res.status !== 201) {
      throw new Error(`No se pudo iniciar sesión como ${who}: ${res.status} ${JSON.stringify(res.body)}`);
    }
    token[who] = res.body.accessToken;
  }

  return {
    token,
    userId,
    cycleA: a.cycle,
    cycleB: b.cycle,
    cycleC: c.cycle,
    sA: a.session,
    sB: b.session,
    sC: c.session,
    seA: a.sessionExercise,
    seB: b.sessionExercise,
    seC: c.sessionExercise,
    templateA: templateA.id,
    templateB: templateB.id,
    routineA: routineA.id,
    routineB: routineB.id,
    exerciseA: exerciseA.id,
    exerciseB: exerciseB.id,
    globalExercise: globalExercise.id,
    notificationB: notificationB.id,
  };
}

export type { PrismaService };
