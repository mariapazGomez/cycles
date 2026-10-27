import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import { SessionsService } from "./sessions.service";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const cycle = {
  id: "y1",
  coachId: "c1",
  athleteId: "a1",
  isTemplate: false,
  cycleType: "mesocycle",
  sessionsPerWeek: 2,
  startDate: d("2026-10-26"),
  endDate: d("2026-11-22"),
};
const routine = {
  id: "r1",
  coachId: "c1",
  name: "Empuje A",
  routineExercises: [
    { exerciseId: "e1", orderIndex: 0, defaultSets: 3, defaultReps: 8, defaultWeight: null, defaultRestSeconds: 90, defaultRir: 2 },
  ],
};

function setup() {
  const tx = {
    trainingSession: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  };
  const prisma = {
    trainingCycle: { findUnique: jest.fn() },
    coachAthlete: { findUnique: jest.fn() },
    routine: { findUnique: jest.fn() },
    trainingSession: { findUnique: jest.fn(), create: jest.fn(), findUniqueOrThrow: jest.fn() },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const notifications = { coachEditedSession: jest.fn() };
  const service = new SessionsService(prisma as never, notifications as never);
  prisma.trainingCycle.findUnique.mockResolvedValue(cycle);
  prisma.coachAthlete.findUnique.mockResolvedValue({ status: "active" });
  prisma.routine.findUnique.mockResolvedValue(routine);
  return { prisma, tx, notifications, service };
}

describe("SessionsService.createSession: reglas de acceso", () => {
  it("otro coach no puede agregar sesiones", async () => {
    const { service } = setup();
    await expect(service.createSession("c2", "y1", { routineId: "r1", scheduledDate: "2026-10-27" })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("una plantilla no tiene sesiones", async () => {
    const { prisma, service } = setup();
    prisma.trainingCycle.findUnique.mockResolvedValue({ ...cycle, isTemplate: true, athleteId: null });
    await expect(service.createSession("c1", "y1", { routineId: "r1", scheduledDate: "2026-10-27" })).rejects.toThrow(
      BadRequestException,
    );
  });

  it("sin relación activa con el atleta no se agrega nada", async () => {
    const { prisma, service } = setup();
    prisma.coachAthlete.findUnique.mockResolvedValue({ status: "inactive" });
    await expect(service.createSession("c1", "y1", { routineId: "r1", scheduledDate: "2026-10-27" })).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("la rutina de otro coach no está disponible", async () => {
    const { prisma, service } = setup();
    prisma.routine.findUnique.mockResolvedValue({ ...routine, coachId: "c2" });
    await expect(service.createSession("c1", "y1", { routineId: "r1", scheduledDate: "2026-10-27" })).rejects.toThrow(
      BadRequestException,
    );
  });

  it("hay que indicar el día o la celda", async () => {
    const { service } = setup();
    await expect(service.createSession("c1", "y1", { routineId: "r1" })).rejects.toThrow(BadRequestException);
  });
});

describe("SessionsService.createSession: por día", () => {
  it("rechaza un día fuera del ciclo", async () => {
    const { prisma, service } = setup();
    await expect(service.createSession("c1", "y1", { routineId: "r1", scheduledDate: "2026-10-25" })).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.createSession("c1", "y1", { routineId: "r1", scheduledDate: "2026-11-23" })).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("calcula la semana, toma el siguiente espacio y no exige el tope de sesiones por semana", async () => {
    const { prisma, tx, notifications, service } = setup();
    // La semana ya tiene 2 sesiones (el ciclo dice 2 por semana): la tercera se permite.
    tx.trainingSession.findFirst.mockResolvedValue({ slotNumber: 2 });
    tx.trainingSession.create.mockResolvedValue({ id: "s3" });
    tx.trainingSession.findMany.mockResolvedValue([
      { id: "s1", slotNumber: 1, scheduledDate: d("2026-11-02") },
      { id: "s2", slotNumber: 2, scheduledDate: d("2026-11-04") },
      { id: "s3", slotNumber: 3, scheduledDate: d("2026-11-06") },
    ]);
    prisma.trainingSession.findUniqueOrThrow.mockResolvedValue({ id: "s3" });

    await service.createSession("c1", "y1", { routineId: "r1", scheduledDate: "2026-11-06" });

    const data = tx.trainingSession.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ cycleId: "y1", weekNumber: 2, slotNumber: 3, routineId: "r1" });
    expect(data.scheduledDate.toISOString()).toBe("2026-11-06T00:00:00.000Z");
    expect(tx.trainingSession.update).not.toHaveBeenCalled();
    expect(notifications.coachEditedSession).toHaveBeenCalledWith("s3", "added");
  });

  it("permite dos sesiones el mismo día", async () => {
    const { prisma, tx, service } = setup();
    tx.trainingSession.findFirst.mockResolvedValue({ slotNumber: 1 });
    tx.trainingSession.create.mockResolvedValue({ id: "s2" });
    tx.trainingSession.findMany.mockResolvedValue([
      { id: "s1", slotNumber: 1, scheduledDate: d("2026-10-27") },
      { id: "s2", slotNumber: 2, scheduledDate: d("2026-10-27") },
    ]);
    prisma.trainingSession.findUniqueOrThrow.mockResolvedValue({ id: "s2" });
    await expect(service.createSession("c1", "y1", { routineId: "r1", scheduledDate: "2026-10-27" })).resolves.toBeDefined();
    expect(tx.trainingSession.update).not.toHaveBeenCalled();
  });

  it("una sesión en un día anterior reordena los espacios pasando por números negativos", async () => {
    const { prisma, tx, service } = setup();
    tx.trainingSession.findFirst.mockResolvedValue({ slotNumber: 2 });
    tx.trainingSession.create.mockResolvedValue({ id: "c" });
    tx.trainingSession.findMany.mockResolvedValue([
      { id: "a", slotNumber: 1, scheduledDate: d("2026-10-26") },
      { id: "b", slotNumber: 2, scheduledDate: d("2026-10-28") },
      { id: "c", slotNumber: 3, scheduledDate: d("2026-10-27") },
    ]);
    prisma.trainingSession.findUniqueOrThrow.mockResolvedValue({ id: "c" });

    await service.createSession("c1", "y1", { routineId: "r1", scheduledDate: "2026-10-27" });

    const updates = tx.trainingSession.update.mock.calls.map(([arg]) => [arg.where.id, arg.data.slotNumber]);
    // Primero los dos pasan a negativos y luego a su espacio final.
    expect(updates).toEqual([
      ["c", -3],
      ["b", -2],
      ["c", 2],
      ["b", 3],
    ]);
  });
});

describe("SessionsService.createSession: por celda (grilla anterior)", () => {
  it("sigue exigiendo el tope de sesiones por semana", async () => {
    const { service } = setup();
    await expect(
      service.createSession("c1", "y1", { routineId: "r1", weekNumber: 1, slotNumber: 3 }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rechaza una celda ocupada", async () => {
    const { prisma, service } = setup();
    prisma.trainingSession.findUnique.mockResolvedValue({ id: "s1" });
    await expect(
      service.createSession("c1", "y1", { routineId: "r1", weekNumber: 1, slotNumber: 1 }),
    ).rejects.toThrow(ConflictException);
  });

  it("crea la sesión en la celda pedida", async () => {
    const { prisma, service } = setup();
    prisma.trainingSession.findUnique.mockResolvedValue(null);
    prisma.trainingSession.create.mockResolvedValue({ id: "s9" });
    await service.createSession("c1", "y1", { routineId: "r1", weekNumber: 2, slotNumber: 1 });
    expect(prisma.trainingSession.create.mock.calls[0][0].data).toMatchObject({ weekNumber: 2, slotNumber: 1 });
  });
});
