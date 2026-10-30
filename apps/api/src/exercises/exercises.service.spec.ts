import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { ExercisesService, normalizeName } from "./exercises.service";

function setup(existing: Array<{ id: string; name: string; createdBy: string | null }> = []) {
  const prisma = {
    exercise: {
      findMany: jest.fn().mockResolvedValue(existing),
      findUnique: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: "new" }),
      update: jest.fn().mockResolvedValue({}),
    },
  };
  return { prisma, service: new ExercisesService(prisma as never) };
}

const dto = { name: "  Remo en máquina ", muscleGroup: "back", equipment: ["machine"] } as never;

describe("normalizeName", () => {
  it("ignora tildes, mayúsculas y espacios de más", () => {
    expect(normalizeName("  Press  BANCA ")).toBe(normalizeName("press banca"));
    expect(normalizeName("Dominadas")).toBe(normalizeName("dominádas"));
  });
});

describe("ExercisesService.create", () => {
  it("guarda el nombre sin espacios sobrantes y a nombre del coach", async () => {
    const { prisma, service } = setup();
    await service.create("c1", dto);
    expect(prisma.exercise.create.mock.calls[0][0].data).toMatchObject({
      name: "Remo en máquina",
      createdBy: "c1",
      equipment: ["machine"],
    });
  });

  it("rechaza un nombre que ya está en el catálogo", async () => {
    const { prisma, service } = setup([{ id: "g1", name: "Remo en Maquina", createdBy: null }]);
    await expect(service.create("c1", dto)).rejects.toThrow(/catálogo de Cycles ya tiene/);
    expect(prisma.exercise.create).not.toHaveBeenCalled();
  });

  it("rechaza un nombre que ya es suyo", async () => {
    const { service } = setup([{ id: "m1", name: "remo en máquina", createdBy: "c1" }]);
    await expect(service.create("c1", dto)).rejects.toThrow(ConflictException);
    await expect(service.create("c1", dto)).rejects.toThrow(/Ya tienes un ejercicio/);
  });

  it("«Peso corporal» no se combina con otros implementos", async () => {
    const { prisma, service } = setup();
    await expect(service.create("c1", { ...(dto as object), equipment: ["bodyweight", "bench"] } as never)).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.exercise.create).not.toHaveBeenCalled();
  });

  it("acepta «Peso corporal» solo", async () => {
    const { prisma, service } = setup();
    await service.create("c1", { ...(dto as object), equipment: ["bodyweight"] } as never);
    expect(prisma.exercise.create).toHaveBeenCalled();
  });
});

describe("ExercisesService.update", () => {
  const own = { id: "e1", name: "Remo en máquina", createdBy: "c1" };

  it("corrige la descripción sin revisar el nombre", async () => {
    const { prisma, service } = setup();
    prisma.exercise.findUnique.mockResolvedValue(own);
    await service.update("c1", "e1", { description: "Agarre neutro" });
    expect(prisma.exercise.findMany).not.toHaveBeenCalled();
    expect(prisma.exercise.update.mock.calls[0][0].data).toEqual({ description: "Agarre neutro" });
  });

  it("al cambiar el nombre no choca consigo mismo pero sí con otro", async () => {
    const { prisma, service } = setup([own, { id: "e2", name: "Remo con barra", createdBy: "c1" }]);
    prisma.exercise.findUnique.mockResolvedValue(own);
    await service.update("c1", "e1", { name: "Remo en máquina sentado" });
    await expect(service.update("c1", "e1", { name: "remo con barra" })).rejects.toThrow(ConflictException);
  });

  it("no deja editar el de otro coach ni el del catálogo", async () => {
    const { prisma, service } = setup();
    prisma.exercise.findUnique.mockResolvedValue({ ...own, createdBy: "c2" });
    await expect(service.update("c1", "e1", { name: "X" })).rejects.toThrow(ForbiddenException);
    prisma.exercise.findUnique.mockResolvedValue({ ...own, createdBy: null });
    await expect(service.update("c1", "e1", { name: "X" })).rejects.toThrow(ForbiddenException);
    expect(prisma.exercise.update).not.toHaveBeenCalled();
  });

  it("avisa si el ejercicio no existe", async () => {
    const { prisma, service } = setup();
    prisma.exercise.findUnique.mockResolvedValue(null);
    await expect(service.update("c1", "zz", { name: "X" })).rejects.toThrow(NotFoundException);
  });
});
