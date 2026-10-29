import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import { SessionsService } from "./sessions.service";

// «Hoy» fijo para las reglas de «solo desde hoy». Solo se simula Date.
const ONLY_DATE = [
  "hrtime", "nextTick", "performance", "queueMicrotask", "requestAnimationFrame", "cancelAnimationFrame",
  "requestIdleCallback", "cancelIdleCallback", "setImmediate", "clearImmediate", "setInterval", "clearInterval",
  "setTimeout", "clearTimeout",
] as const;
beforeAll(() => {
  jest.useFakeTimers({ now: new Date("2026-10-27T12:00:00.000Z"), doNotFake: [...ONLY_DATE] });
});
afterAll(() => {
  jest.useRealTimers();
});

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const cycle = {
  id: "y1",
  coachId: "c1",
  athleteId: "a1",
  isTemplate: false,
  status: "active",
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
    trainingSession: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
  };
  const prisma = {
    trainingCycle: { findUnique: jest.fn() },
    coachAthlete: { findUnique: jest.fn() },
    routine: { findUnique: jest.fn() },
    trainingSession: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    exerciseLog: { count: jest.fn().mockResolvedValue(0) },
    sessionFeedback: { count: jest.fn().mockResolvedValue(0) },
    sessionExercise: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn() },
    $transaction: jest.fn((arg: unknown) => (typeof arg === "function" ? arg(tx) : Promise.all(arg as unknown[]))),
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

describe("SessionsService.createSession: solo desde hoy", () => {
  it("rechaza un día que ya pasó", async () => {
    const { service } = setup();
    await expect(service.createSession("c1", "y1", { routineId: "r1", scheduledDate: "2026-10-27", today: "2026-10-28" })).rejects.toThrow(
      "desde hoy",
    );
  });

  it("con la fecha local del coach, hoy sí y ayer no", async () => {
    const { prisma, tx, service } = setup();
    tx.trainingSession.findFirst.mockResolvedValue(null);
    tx.trainingSession.create.mockResolvedValue({ id: "n" });
    tx.trainingSession.findMany.mockResolvedValue([]);
    prisma.trainingSession.findUniqueOrThrow.mockResolvedValue({ id: "n" });
    await expect(
      service.createSession("c1", "y1", { routineId: "r1", scheduledDate: "2026-10-28", today: "2026-10-28" }),
    ).resolves.toBeDefined();
    await expect(
      service.createSession("c1", "y1", { routineId: "r1", scheduledDate: "2026-10-27", today: "2026-10-28" }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rechaza una fecha local a más de un día del servidor", async () => {
    const { service } = setup();
    await expect(
      service.createSession("c1", "y1", { routineId: "r1", scheduledDate: "2026-11-05", today: "2026-11-05" }),
    ).rejects.toThrow("no es válida");
  });
});

const pendingSession = {
  id: "s1",
  cycleId: "y1",
  name: "Empuje A",
  weekNumber: 1,
  slotNumber: 1,
  scheduledDate: d("2026-10-28"),
  status: "pending",
  routineId: "r1",
  deletedAt: null,
  cycle,
};

describe("SessionsService.updateSession: mover por fecha", () => {
  it("otro coach no puede mover la sesión", async () => {
    const { prisma, service } = setup();
    prisma.trainingSession.findUnique.mockResolvedValue(pendingSession);
    await expect(service.updateSession("c2", "s1", { scheduledDate: "2026-10-30" })).rejects.toThrow(ForbiddenException);
  });

  it("cambiar solo el nombre, o mandar la misma fecha, no valida ni mueve", async () => {
    const { prisma, service } = setup();
    prisma.trainingSession.findUnique.mockResolvedValue({ ...pendingSession, scheduledDate: d("2026-10-20") });
    prisma.trainingSession.update.mockResolvedValue({ id: "s1" });
    await service.updateSession("c1", "s1", { name: "Otro", scheduledDate: "2026-10-20T00:00:00.000Z" });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.trainingSession.update.mock.calls[0][0].data).toEqual({ name: "Otro" });
  });

  it("no mueve una sesión completada ni omitida", async () => {
    const { prisma, service } = setup();
    for (const status of ["completed", "skipped"]) {
      prisma.trainingSession.findUnique.mockResolvedValue({ ...pendingSession, status });
      await expect(service.updateSession("c1", "s1", { scheduledDate: "2026-10-30" })).rejects.toThrow(ConflictException);
    }
  });

  it("no mueve una sesión con series registradas", async () => {
    const { prisma, service } = setup();
    prisma.trainingSession.findUnique.mockResolvedValue(pendingSession);
    prisma.exerciseLog.count.mockResolvedValue(2);
    await expect(service.updateSession("c1", "s1", { scheduledDate: "2026-10-30" })).rejects.toThrow(ConflictException);
  });

  it("rechaza un día pasado o fuera del ciclo", async () => {
    const { prisma, service } = setup();
    prisma.trainingSession.findUnique.mockResolvedValue(pendingSession);
    await expect(service.updateSession("c1", "s1", { scheduledDate: "2026-10-27", today: "2026-10-28" })).rejects.toThrow("desde hoy");
    await expect(service.updateSession("c1", "s1", { scheduledDate: "2026-11-23" })).rejects.toThrow("fuera del ciclo");
  });

  it("dentro de la misma semana cambia la fecha y reordena los espacios", async () => {
    const { prisma, tx, service } = setup();
    prisma.trainingSession.findUnique.mockResolvedValue(pendingSession);
    tx.trainingSession.update.mockResolvedValue({});
    tx.trainingSession.findUniqueOrThrow.mockResolvedValue({ id: "s1" });
    tx.trainingSession.findMany.mockResolvedValue([
      { id: "s1", slotNumber: 1, scheduledDate: d("2026-11-01") },
      { id: "s2", slotNumber: 2, scheduledDate: d("2026-10-30") },
    ]);
    await service.updateSession("c1", "s1", { scheduledDate: "2026-11-01" });
    const updates = tx.trainingSession.update.mock.calls.map(([arg]) => [arg.where.id, arg.data.slotNumber]);
    expect(updates[0][1]).toBe(1);
    expect(updates.slice(1)).toEqual([["s2", -2], ["s1", -1], ["s2", 1], ["s1", 2]]);
  });

  it("a otra semana toma el último espacio de la semana nueva y reordena las dos", async () => {
    const { prisma, tx, notifications, service } = setup();
    prisma.trainingSession.findUnique.mockResolvedValue(pendingSession);
    tx.trainingSession.findFirst.mockResolvedValue({ slotNumber: 3 });
    tx.trainingSession.update.mockResolvedValue({});
    tx.trainingSession.findUniqueOrThrow.mockResolvedValue({ id: "s1" });
    tx.trainingSession.findMany.mockResolvedValue([]);
    await service.updateSession("c1", "s1", { scheduledDate: "2026-11-04" });
    const first = tx.trainingSession.update.mock.calls[0][0];
    expect(first.data).toMatchObject({ weekNumber: 2, slotNumber: 4 });
    expect(first.data.scheduledDate.toISOString()).toBe("2026-11-04T00:00:00.000Z");
    const weeks = tx.trainingSession.findMany.mock.calls.map(([arg]) => arg.where.weekNumber);
    expect(weeks).toEqual([2, 1]);
    expect(notifications.coachEditedSession).toHaveBeenCalledWith("s1", "changed");
  });
});

describe("SessionsService.deleteSession: borrado lógico", () => {
  it("marca deletedAt y no destruye la sesión", async () => {
    const { prisma, service } = setup();
    prisma.trainingSession.findUnique.mockResolvedValue(pendingSession);
    await service.deleteSession("c1", "s1");
    const arg = prisma.trainingSession.update.mock.calls[0][0];
    expect(arg.where).toEqual({ id: "s1" });
    expect(arg.data.deletedAt).toBeInstanceOf(Date);
  });

  it("no quita una sesión completada ni una con series", async () => {
    const { prisma, service } = setup();
    prisma.trainingSession.findUnique.mockResolvedValue({ ...pendingSession, status: "completed" });
    await expect(service.deleteSession("c1", "s1")).rejects.toThrow(ConflictException);
    prisma.trainingSession.findUnique.mockResolvedValue(pendingSession);
    prisma.exerciseLog.count.mockResolvedValue(1);
    await expect(service.deleteSession("c1", "s1")).rejects.toThrow(ConflictException);
    expect(prisma.trainingSession.update).not.toHaveBeenCalled();
  });

  it("una omitida sí se puede quitar (queda oculta)", async () => {
    const { prisma, service } = setup();
    prisma.trainingSession.findUnique.mockResolvedValue({ ...pendingSession, status: "skipped" });
    await service.deleteSession("c1", "s1");
    expect(prisma.trainingSession.update).toHaveBeenCalled();
  });

  it("quitar una ya quitada no hace nada", async () => {
    const { prisma, service } = setup();
    prisma.trainingSession.findUnique.mockResolvedValue({ ...pendingSession, deletedAt: new Date() });
    await service.deleteSession("c1", "s1");
    expect(prisma.trainingSession.update).not.toHaveBeenCalled();
  });

  it("purga solo las quitadas hace más de 24 h sin series ni cierre", async () => {
    const { prisma, service } = setup();
    prisma.trainingSession.findUnique.mockResolvedValue(pendingSession);
    prisma.trainingSession.findMany.mockResolvedValue([{ id: "viejo" }]);
    await service.deleteSession("c1", "s1");
    const where = prisma.trainingSession.findMany.mock.calls[0][0].where;
    expect(where.cycleId).toBe("y1");
    expect(where.deletedAt.lt.toISOString()).toBe("2026-10-26T12:00:00.000Z");
    expect(where.feedback).toEqual({ none: {} });
    expect(where.sessionExercises).toEqual({ every: { logs: { none: {} } } });
    expect(prisma.sessionExercise.deleteMany).toHaveBeenCalledWith({ where: { sessionId: { in: ["viejo"] } } });
    expect(prisma.trainingSession.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["viejo"] } } });
  });

  it("una sesión quitada ya no se puede editar ni ver", async () => {
    const { prisma, service } = setup();
    prisma.trainingSession.findUnique.mockResolvedValue({ ...pendingSession, deletedAt: new Date() });
    await expect(service.updateSession("c1", "s1", { name: "x" })).rejects.toThrow("no encontrada");
    await expect(service.getSessionDetail({ id: "c1", role: "coach" } as never, "s1")).rejects.toThrow("no encontrada");
  });
});

describe("SessionsService.restoreSession", () => {
  it("limpia deletedAt y reordena la semana", async () => {
    const { prisma, tx, service } = setup();
    prisma.trainingSession.findUnique.mockResolvedValue({ ...pendingSession, deletedAt: new Date() });
    tx.trainingSession.update.mockResolvedValue({});
    tx.trainingSession.findMany.mockResolvedValue([]);
    tx.trainingSession.findUniqueOrThrow.mockResolvedValue({ id: "s1", deletedAt: null });
    await service.restoreSession("c1", "s1");
    expect(tx.trainingSession.update.mock.calls[0][0].data).toEqual({ deletedAt: null });
    expect(tx.trainingSession.findMany.mock.calls[0][0].where).toEqual({ cycleId: "y1", weekNumber: 1 });
  });

  it("otro coach no puede restaurar", async () => {
    const { prisma, service } = setup();
    prisma.trainingSession.findUnique.mockResolvedValue({ ...pendingSession, deletedAt: new Date() });
    await expect(service.restoreSession("c2", "s1")).rejects.toThrow(ForbiddenException);
  });
});

describe("SessionsService.duplicateSession", () => {
  it("copia la sesión con sus ejercicios como pendiente en el último espacio del día", async () => {
    const { prisma, tx, notifications, service } = setup();
    prisma.trainingSession.findUnique.mockResolvedValue({ ...pendingSession, status: "skipped" });
    prisma.sessionExercise.findMany.mockResolvedValue([
      { exerciseId: "e1", orderIndex: 1, targetSets: 4, targetReps: 6, targetWeight: 60, targetRestSeconds: 120, targetRir: 1 },
    ]);
    tx.trainingSession.findFirst.mockResolvedValue({ slotNumber: 2 });
    tx.trainingSession.create.mockResolvedValue({ id: "copia" });
    tx.trainingSession.findMany.mockResolvedValue([]);
    prisma.trainingSession.findUniqueOrThrow.mockResolvedValue({ id: "copia" });
    await service.duplicateSession("c1", "s1", { scheduledDate: "2026-10-30" });
    const data = tx.trainingSession.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ cycleId: "y1", name: "Empuje A", weekNumber: 1, slotNumber: 3, routineId: "r1" });
    expect(data.status).toBeUndefined();
    expect(data.sessionExercises.create).toEqual([
      { exerciseId: "e1", orderIndex: 1, targetSets: 4, targetReps: 6, targetWeight: 60, targetRestSeconds: 120, targetRir: 1 },
    ]);
    expect(notifications.coachEditedSession).toHaveBeenCalledWith("copia", "added");
  });

  it("exige un día vigente dentro del ciclo", async () => {
    const { prisma, service } = setup();
    prisma.trainingSession.findUnique.mockResolvedValue(pendingSession);
    await expect(service.duplicateSession("c1", "s1", { scheduledDate: "2026-10-27", today: "2026-10-28" })).rejects.toThrow("desde hoy");
    await expect(service.duplicateSession("c1", "s1", { scheduledDate: "2026-12-01" })).rejects.toThrow("fuera del ciclo");
  });
});

describe("SessionsService: ciclos que no están activos son de solo lectura", () => {
  const closed = { ...pendingSession, cycle: { ...cycle, status: "completed" } };

  it("no agrega sesiones", async () => {
    const { prisma, service } = setup();
    prisma.trainingCycle.findUnique.mockResolvedValue({ ...cycle, status: "archived" });
    await expect(service.createSession("c1", "y1", { routineId: "r1", scheduledDate: "2026-10-30" })).rejects.toThrow("archivado");
  });

  it("no mueve, duplica, quita ni restaura", async () => {
    const { prisma, service } = setup();
    prisma.trainingSession.findUnique.mockResolvedValue(closed);
    await expect(service.updateSession("c1", "s1", { scheduledDate: "2026-10-30" })).rejects.toThrow("completado");
    await expect(service.duplicateSession("c1", "s1", { scheduledDate: "2026-10-30" })).rejects.toThrow(ConflictException);
    await expect(service.deleteSession("c1", "s1")).rejects.toThrow(ConflictException);
    prisma.trainingSession.findUnique.mockResolvedValue({ ...closed, deletedAt: new Date() });
    await expect(service.restoreSession("c1", "s1")).rejects.toThrow(ConflictException);
    expect(prisma.trainingSession.update).not.toHaveBeenCalled();
  });

  it("renombrar sí se puede", async () => {
    const { prisma, service } = setup();
    prisma.trainingSession.findUnique.mockResolvedValue(closed);
    prisma.trainingSession.update.mockResolvedValue({ id: "s1" });
    await expect(service.updateSession("c1", "s1", { name: "Otro" })).resolves.toBeDefined();
  });
});
