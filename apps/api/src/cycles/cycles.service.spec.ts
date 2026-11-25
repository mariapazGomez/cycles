import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { CyclesService } from "./cycles.service";
import { AuthenticatedUser } from "../common/decorators/current-user.decorator";

// Prisma simulado: solo lo que el servicio de ciclos toca.
function setup() {
  const prisma = {
    trainingCycle: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    trainingSession: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
    coachAthlete: { findUnique: jest.fn() },
    // La transacción usa el mismo prisma simulado.
    $transaction: jest.fn(async (work: (tx: unknown) => unknown): Promise<unknown> => work(prisma)),
  };
  const activity = { planCreated: jest.fn() };
  const service = new CyclesService(prisma as never, activity as never);
  return { prisma, activity, service };
}

const coach = (id = "c1"): AuthenticatedUser => ({ id, role: "coach" }) as AuthenticatedUser;
const athlete = (id = "a1"): AuthenticatedUser => ({ id, role: "athlete" }) as AuthenticatedUser;
const activeRelation = { status: "active" };
const template = {
  id: "t1",
  coachId: "c1",
  athleteId: null,
  isTemplate: true,
  name: "Fuerza base",
  objective: "Base",
  cycleType: "mesocycle",
  sessionsPerWeek: 3,
  templateWeeks: 5,
};

describe("CyclesService: plantillas", () => {
  it("crea una plantilla sin atleta y con fechas de referencia", async () => {
    const { prisma, service } = setup();
    prisma.trainingCycle.create.mockResolvedValue({ id: "t1" });
    await service.createTemplate("c1", { name: "Fuerza base", cycleType: "mesocycle", weeks: 5, sessionsPerWeek: 3 });
    const data = prisma.trainingCycle.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ coachId: "c1", isTemplate: true, templateWeeks: 5, sessionsPerWeek: 3 });
    expect(data.athleteId).toBeUndefined();
    expect(data.startDate.toISOString()).toBe("2001-01-01T00:00:00.000Z");
    expect(data.endDate.toISOString()).toBe("2001-02-04T00:00:00.000Z");
  });

  it("al cambiar las semanas de una plantilla recalcula su fin", async () => {
    const { prisma, service } = setup();
    prisma.trainingCycle.findUnique.mockResolvedValue(template);
    prisma.trainingCycle.update.mockResolvedValue({});
    await service.updateTemplate("c1", "t1", { weeks: 2 });
    const data = prisma.trainingCycle.update.mock.calls[0][0].data;
    expect(data.templateWeeks).toBe(2);
    expect(data.endDate.toISOString()).toBe("2001-01-14T00:00:00.000Z");
  });

  it("otro coach no puede editar la plantilla", async () => {
    const { prisma, service } = setup();
    prisma.trainingCycle.findUnique.mockResolvedValue(template);
    await expect(service.updateTemplate("c2", "t1", { name: "X" })).rejects.toThrow(ForbiddenException);
    expect(prisma.trainingCycle.update).not.toHaveBeenCalled();
  });

  it("PATCH /cycles/:id no edita plantillas", async () => {
    const { prisma, service } = setup();
    prisma.trainingCycle.findUnique.mockResolvedValue(template);
    await expect(service.update("c1", "t1", { name: "X" })).rejects.toThrow(BadRequestException);
  });
});

describe("CyclesService.assign", () => {
  const dto = { athleteId: "a1", startDate: "2026-11-02", today: "2026-11-02" };
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date("2026-11-02T12:00:00.000Z")));
  afterEach(() => jest.useRealTimers());

  it("no asigna con inicio anterior a hoy", async () => {
    const { prisma, service } = setup();
    prisma.trainingCycle.findUnique.mockResolvedValue(template);
    prisma.coachAthlete.findUnique.mockResolvedValue(activeRelation);
    await expect(service.assign("c1", "t1", { ...dto, startDate: "2026-10-26" })).rejects.toThrow("no puede empezar antes de hoy");
    expect(prisma.trainingCycle.create).not.toHaveBeenCalled();
  });

  it("copia la plantilla con fechas reales y templateId", async () => {
    const { prisma, activity, service } = setup();
    prisma.trainingCycle.findUnique.mockResolvedValue(template);
    prisma.coachAthlete.findUnique.mockResolvedValue(activeRelation);
    prisma.trainingCycle.create.mockResolvedValue({ id: "y1" });
    await service.assign("c1", "t1", dto);
    const data = prisma.trainingCycle.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      coachId: "c1",
      athleteId: "a1",
      templateId: "t1",
      name: "Fuerza base",
      cycleType: "mesocycle",
      sessionsPerWeek: 3,
    });
    expect(data.startDate.toISOString()).toBe("2026-11-02T00:00:00.000Z");
    expect(data.endDate.toISOString()).toBe("2026-12-06T00:00:00.000Z");
    expect(data.isTemplate).toBeUndefined();
    expect(activity.planCreated).toHaveBeenCalled();
  });

  it("otro coach no puede asignar la plantilla", async () => {
    const { prisma, service } = setup();
    prisma.trainingCycle.findUnique.mockResolvedValue(template);
    await expect(service.assign("c2", "t1", dto)).rejects.toThrow(ForbiddenException);
    expect(prisma.trainingCycle.create).not.toHaveBeenCalled();
  });

  it("no asigna a un atleta sin relación activa", async () => {
    const { prisma, service } = setup();
    prisma.trainingCycle.findUnique.mockResolvedValue(template);
    prisma.coachAthlete.findUnique.mockResolvedValue({ status: "inactive" });
    await expect(service.assign("c1", "t1", dto)).rejects.toThrow(ForbiddenException);
    expect(prisma.trainingCycle.create).not.toHaveBeenCalled();
  });

  it("no asigna a un atleta que no es suyo", async () => {
    const { prisma, service } = setup();
    prisma.trainingCycle.findUnique.mockResolvedValue(template);
    prisma.coachAthlete.findUnique.mockResolvedValue(null);
    await expect(service.assign("c1", "t1", dto)).rejects.toThrow(ForbiddenException);
  });

  it("solo se asignan plantillas", async () => {
    const { prisma, service } = setup();
    prisma.trainingCycle.findUnique.mockResolvedValue({ ...template, isTemplate: false, athleteId: "a1" });
    await expect(service.assign("c1", "t1", dto)).rejects.toThrow(BadRequestException);
  });

  it("una plantilla que no existe da 404", async () => {
    const { prisma, service } = setup();
    prisma.trainingCycle.findUnique.mockResolvedValue(null);
    await expect(service.assign("c1", "nope", dto)).rejects.toThrow(NotFoundException);
  });
});

describe("CyclesService.getOne", () => {
  it("el coach dueño ve su plantilla sin necesitar un atleta", async () => {
    const { prisma, service } = setup();
    prisma.trainingCycle.findUnique.mockResolvedValue(template);
    await expect(service.getOne(coach(), "t1")).resolves.toBe(template);
    expect(prisma.coachAthlete.findUnique).not.toHaveBeenCalled();
  });

  it("un atleta no puede ver una plantilla", async () => {
    const { prisma, service } = setup();
    prisma.trainingCycle.findUnique.mockResolvedValue(template);
    await expect(service.getOne(athlete(), "t1")).rejects.toThrow(ForbiddenException);
  });

  it("otro coach no puede ver la plantilla", async () => {
    const { prisma, service } = setup();
    prisma.trainingCycle.findUnique.mockResolvedValue(template);
    await expect(service.getOne(coach("c2"), "t1")).rejects.toThrow(ForbiddenException);
  });
});

describe("CyclesService.list", () => {
  const whereOf = (prisma: ReturnType<typeof setup>["prisma"]) => prisma.trainingCycle.findMany.mock.calls[0][0].where;

  it("por defecto el coach no recibe plantillas", async () => {
    const { prisma, service } = setup();
    await service.list(coach(), {});
    const where = whereOf(prisma);
    expect(where.isTemplate).toBeUndefined();
    expect(where.OR).toBeUndefined();
    expect(where.athlete).toBeDefined();
  });

  it("templates=include suma las plantillas a los ciclos de sus atletas", async () => {
    const { prisma, service } = setup();
    await service.list(coach(), { templates: "include" });
    const where = whereOf(prisma);
    expect(where.OR).toHaveLength(2);
    expect(where.OR[0]).toEqual({ isTemplate: true });
    expect(where.coachId).toBe("c1");
  });

  it("templates=only trae solo las plantillas", async () => {
    const { prisma, service } = setup();
    await service.list(coach(), { templates: "only" });
    expect(whereOf(prisma)).toMatchObject({ coachId: "c1", isTemplate: true });
  });

  it("con el filtro de un atleta se ignora templates", async () => {
    const { prisma, service } = setup();
    await service.list(coach(), { athleteId: "a1", templates: "include" });
    const where = whereOf(prisma);
    expect(where.OR).toBeUndefined();
    expect(where.athleteId).toBe("a1");
  });

  it("el atleta solo recibe lo suyo, aunque pida plantillas", async () => {
    const { prisma, service } = setup();
    await service.list(athlete(), { templates: "only" });
    const where = whereOf(prisma);
    expect(where.athleteId).toBe("a1");
    expect(where.isTemplate).toBeUndefined();
    expect(where.OR).toBeUndefined();
  });
});

describe("CyclesService: fechas del ciclo (CYC-314)", () => {
  const cycle = {
    id: "y1",
    coachId: "c1",
    athleteId: "a1",
    isTemplate: false,
    startDate: new Date("2026-10-05T00:00:00.000Z"),
    endDate: new Date("2026-11-15T00:00:00.000Z"),
  };
  const session = (id: string, weekNumber: number, day: string) => ({ id, weekNumber, slotNumber: 1, scheduledDate: new Date(`${day}T00:00:00.000Z`), deletedAt: null });
  const ready = () => {
    const t = setup();
    t.prisma.trainingCycle.findUnique.mockResolvedValue(cycle);
    t.prisma.coachAthlete.findUnique.mockResolvedValue(activeRelation);
    t.prisma.trainingCycle.update.mockResolvedValue({ id: "y1" });
    return t;
  };
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date("2026-10-20T12:00:00.000Z")));
  afterEach(() => jest.useRealTimers());

  const base = { athleteId: "a1", name: "Fuerza", startDate: "2026-10-20", endDate: "2026-11-16", today: "2026-10-20" };

  it("crea solo con nombre y fechas: sin tipo ni sesiones por semana", async () => {
    const { prisma, service } = ready();
    prisma.trainingCycle.create.mockResolvedValue({ id: "n1" });
    await service.create("c1", base);
    expect(prisma.trainingCycle.create.mock.calls[0][0].data).toMatchObject({ cycleType: "mesocycle", sessionsPerWeek: null });
  });

  it("no crea con inicio de ayer, de un solo día ni macrociclos", async () => {
    const { prisma, service } = ready();
    await expect(service.create("c1", { ...base, startDate: "2026-10-19" })).rejects.toThrow("no puede empezar antes de hoy");
    await expect(service.create("c1", { ...base, endDate: "2026-10-20" })).rejects.toThrow("posterior a la fecha de inicio");
    await expect(service.create("c1", { ...base, cycleType: "macrocycle" })).rejects.toThrow("macrociclos");
    expect(prisma.trainingCycle.create).not.toHaveBeenCalled();
  });

  it("un ciclo ya empezado se edita sin tocar el inicio, aunque la web lo reenvíe", async () => {
    const { prisma, service } = ready();
    await service.update("c1", "y1", { name: "Nuevo nombre", startDate: "2026-10-05", today: "2026-10-20" });
    expect(prisma.trainingCycle.update).toHaveBeenCalled();
    expect(prisma.trainingSession.update).not.toHaveBeenCalled();
  });

  it("no mueve el inicio a otro día anterior a hoy", async () => {
    const { prisma, service } = ready();
    await expect(service.update("c1", "y1", { startDate: "2026-10-12", today: "2026-10-20" })).rejects.toThrow("no puede empezar antes de hoy");
    expect(prisma.trainingCycle.update).not.toHaveBeenCalled();
  });

  it("no deja sesiones fuera al acortar el final ni al mover el inicio", async () => {
    const { prisma, service } = ready();
    prisma.trainingSession.findMany.mockResolvedValue([session("s1", 5, "2026-11-10")]);
    await expect(service.update("c1", "y1", { endDate: "2026-11-08" })).rejects.toThrow("queda 1 sesión fuera (10 nov)");
    prisma.trainingSession.findMany.mockResolvedValue([session("s2", 1, "2026-10-08")]);
    await expect(service.update("c1", "y1", { startDate: "2026-10-26", today: "2026-10-20" })).rejects.toThrow("queda 1 sesión fuera (8 oct)");
    expect(prisma.trainingCycle.update).not.toHaveBeenCalled();
  });

  it("al mover el inicio recalcula la semana de cada sesión en la misma transacción", async () => {
    const { prisma, service } = ready();
    prisma.trainingSession.findMany.mockResolvedValue([session("s1", 4, "2026-10-28")]);
    await service.update("c1", "y1", { startDate: "2026-10-21", today: "2026-10-20" });
    const calls = prisma.trainingSession.update.mock.calls.map((c: any) => c[0].data);
    expect(calls).toEqual([{ slotNumber: -1 }, { weekNumber: 2, slotNumber: 1 }]);
    expect(prisma.trainingCycle.update).toHaveBeenCalled();
  });

  it("alargar el final no renumera nada", async () => {
    const { prisma, service } = ready();
    await service.update("c1", "y1", { endDate: "2026-11-22" });
    expect(prisma.trainingSession.update).not.toHaveBeenCalled();
    expect(prisma.trainingCycle.update).toHaveBeenCalled();
  });
});
