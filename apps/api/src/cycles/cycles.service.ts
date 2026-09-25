import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { CreateCycleDto } from "./dto/create-cycle.dto";
import { UpdateCycleDto } from "./dto/update-cycle.dto";
import { ListCyclesQueryDto } from "./dto/list-cycles.query.dto";

@Injectable()
export class CyclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(coachId: string, dto: CreateCycleDto) {
    const relation = await this.prisma.coachAthlete.findUnique({
      where: { coachId_athleteId: { coachId, athleteId: dto.athleteId } },
    });
    if (!relation || relation.status !== "active") {
      throw new ForbiddenException(
        "Solo puedes crear planes para atletas con una relación activa contigo.",
      );
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate <= startDate) {
      throw new BadRequestException("La fecha de fin debe ser posterior a la fecha de inicio.");
    }

    const isContainer = dto.cycleType === "macrocycle";
    if (!isContainer && !dto.sessionsPerWeek) {
      throw new BadRequestException("Define cuántas sesiones por semana tiene este plan.");
    }

    let parentCycle = null;
    if (dto.parentCycleId) {
      parentCycle = await this.prisma.trainingCycle.findUnique({ where: { id: dto.parentCycleId } });
      if (!parentCycle || parentCycle.coachId !== coachId) {
        throw new BadRequestException("El macrociclo indicado no existe o no es tuyo.");
      }
      if (parentCycle.cycleType !== "macrocycle") {
        throw new BadRequestException("Un plan solo puede vivir dentro de un macrociclo.");
      }
      if (parentCycle.athleteId !== dto.athleteId) {
        throw new BadRequestException("El macrociclo es de otro atleta.");
      }
    }

    return this.prisma.trainingCycle.create({
      data: {
        coachId,
        athleteId: dto.athleteId,
        name: dto.name,
        objective: dto.objective,
        startDate,
        endDate,
        cycleType: dto.cycleType,
        sessionsPerWeek: isContainer ? null : dto.sessionsPerWeek,
        parentCycleId: dto.parentCycleId,
      },
    });
  }

  // Un coach ve los ciclos que creó; un atleta ve los que le asignaron.
  // Por defecto no incluye planes que viven dentro de un macrociclo — esos
  // se consultan vía getChildren(), anidados bajo su contenedor.
  async list(user: AuthenticatedUser, query: ListCyclesQueryDto) {
    if (user.role === "coach") {
      return this.prisma.trainingCycle.findMany({
        where: {
          coachId: user.id,
          parentCycleId: null,
          ...(query.athleteId ? { athleteId: query.athleteId } : {}),
          ...(query.status ? { status: query.status } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return this.prisma.trainingCycle.findMany({
      where: {
        athleteId: user.id,
        parentCycleId: null,
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getChildren(user: AuthenticatedUser, id: string) {
    const parent = await this.prisma.trainingCycle.findUnique({ where: { id } });
    if (!parent) {
      throw new NotFoundException("Ciclo no encontrado.");
    }
    this.assertAccess(user, parent);
    if (parent.cycleType !== "macrocycle") {
      throw new BadRequestException("Este plan no es un macrociclo, no tiene hijos.");
    }

    return this.prisma.trainingCycle.findMany({
      where: { parentCycleId: id },
      orderBy: { startDate: "asc" },
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const cycle = await this.prisma.trainingCycle.findUnique({ where: { id } });
    if (!cycle) {
      throw new NotFoundException("Ciclo no encontrado.");
    }
    this.assertAccess(user, cycle);

    return cycle;
  }

  private assertAccess(user: AuthenticatedUser, cycle: { coachId: string; athleteId: string }): void {
    const isOwner = user.role === "coach" ? cycle.coachId === user.id : cycle.athleteId === user.id;
    if (!isOwner) {
      throw new ForbiddenException("No tienes acceso a este plan.");
    }
  }

  async update(coachId: string, id: string, dto: UpdateCycleDto) {
    const cycle = await this.prisma.trainingCycle.findUnique({ where: { id } });
    if (!cycle) {
      throw new NotFoundException("Ciclo no encontrado.");
    }
    if (cycle.coachId !== coachId) {
      throw new ForbiddenException("Solo el coach dueño puede editar este ciclo.");
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : cycle.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : cycle.endDate;
    if (endDate <= startDate) {
      throw new BadRequestException("La fecha de fin debe ser posterior a la fecha de inicio.");
    }

    return this.prisma.trainingCycle.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.objective !== undefined ? { objective: dto.objective } : {}),
        ...(dto.startDate !== undefined ? { startDate } : {}),
        ...(dto.endDate !== undefined ? { endDate } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
  }
}
