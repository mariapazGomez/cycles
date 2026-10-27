import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { CyclesService } from "./cycles.service";
import { AuthenticatedUser } from "../common/decorators/current-user.decorator";

// Prisma simulado: solo lo que el servicio de ciclos toca.
function setup() {
  const prisma = {
    trainingCycle: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    coachAthlete: { findUnique: jest.fn() },
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
  const dto = { athleteId: "a1", startDate: "2026-11-02" };

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
