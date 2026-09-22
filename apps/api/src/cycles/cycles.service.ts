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
        "Solo podés crear ciclos para atletas con una relación activa con vos.",
      );
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate <= startDate) {
      throw new BadRequestException("La fecha de fin debe ser posterior a la fecha de inicio.");
    }

    return this.prisma.trainingCycle.create({
      data: {
        coachId,
        athleteId: dto.athleteId,
        name: dto.name,
        objective: dto.objective,
        startDate,
        endDate,
      },
    });
  }

  // Un coach ve los ciclos que creó; un atleta ve los que le asignaron.
  async list(user: AuthenticatedUser, query: ListCyclesQueryDto) {
    if (user.role === "coach") {
      return this.prisma.trainingCycle.findMany({
        where: {
          coachId: user.id,
          ...(query.athleteId ? { athleteId: query.athleteId } : {}),
          ...(query.status ? { status: query.status } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return this.prisma.trainingCycle.findMany({
      where: {
        athleteId: user.id,
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const cycle = await this.prisma.trainingCycle.findUnique({ where: { id } });
    if (!cycle) {
      throw new NotFoundException("Ciclo no encontrado.");
    }

    const isOwner = user.role === "coach" ? cycle.coachId === user.id : cycle.athleteId === user.id;
    if (!isOwner) {
      throw new ForbiddenException("No tenés acceso a este ciclo.");
    }

    return cycle;
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
