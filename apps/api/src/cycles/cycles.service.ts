import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ActivityNotifier } from "../activity/activity-notifier.service";
import { PrismaService } from "../prisma/prisma.service";
import { assertActiveRelation, athleteIdOf } from "../common/access";
import { startOfUtcDay } from "../common/training";
import { AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { CreateCycleDto } from "./dto/create-cycle.dto";
import { UpdateCycleDto } from "./dto/update-cycle.dto";
import { ListCyclesQueryDto } from "./dto/list-cycles.query.dto";
import { CreateTemplateDto } from "./dto/create-template.dto";
import { UpdateTemplateDto } from "./dto/update-template.dto";
import { AssignCycleDto } from "./dto/assign-cycle.dto";
import { endDateForWeeks, templateDates } from "./template-dates";

@Injectable()
export class CyclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityNotifier,
  ) {}

  async create(coachId: string, dto: CreateCycleDto) {
    const relation = await this.prisma.coachAthlete.findUnique({
      where: { coachId_athleteId: { coachId, athleteId: dto.athleteId } },
    });
    if (!relation || relation.status !== "active") {
      throw new ForbiddenException(
        "Solo puedes crear ciclos para atletas con una relación activa contigo.",
      );
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate <= startDate) {
      throw new BadRequestException("La fecha de fin debe ser posterior a la fecha de inicio.");
    }

    const isContainer = dto.cycleType === "macrocycle";
    if (!isContainer && !dto.sessionsPerWeek) {
      throw new BadRequestException("Define cuántas sesiones por semana tiene este ciclo.");
    }

    let parentCycle = null;
    if (dto.parentCycleId) {
      parentCycle = await this.prisma.trainingCycle.findUnique({ where: { id: dto.parentCycleId } });
      if (!parentCycle || parentCycle.coachId !== coachId) {
        throw new BadRequestException("El macrociclo indicado no existe o no es tuyo.");
      }
      if (parentCycle.cycleType !== "macrocycle") {
        throw new BadRequestException("Un ciclo solo puede vivir dentro de un macrociclo.");
      }
      if (parentCycle.athleteId !== dto.athleteId) {
        throw new BadRequestException("El macrociclo es de otro atleta.");
      }
    }

    const cycle = await this.prisma.trainingCycle.create({
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
    this.activity.planCreated(coachId, cycle);
    return cycle;
  }

  // Un coach ve los ciclos que creó; un atleta ve los que le asignaron.
  // Por defecto no incluye planes que viven dentro de un macrociclo — esos
  // se consultan vía getChildren(), anidados bajo su contenedor.
  async list(user: AuthenticatedUser, query: ListCyclesQueryDto) {
    if (user.role === "coach") {
      // Solo planes de atletas con relación activa (docs/SEGURIDAD.md, R5).
      const ofActiveAthletes = {
        athlete: { athleteRelations: { some: { coachId: user.id, status: "active" as const } } },
        ...(query.athleteId ? { athleteId: query.athleteId } : {}),
      };
      // Las plantillas (sin atleta) solo se traen si el coach las pide, y nunca
      // junto con el filtro de un atleta.
      const templates = query.athleteId ? undefined : query.templates;
      const scope =
        templates === "only"
          ? { isTemplate: true }
          : templates === "include"
            ? { OR: [{ isTemplate: true }, ofActiveAthletes] }
            : ofActiveAthletes;
      return this.prisma.trainingCycle.findMany({
        where: {
          coachId: user.id,
          parentCycleId: null,
          ...scope,
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
    await this.assertAccess(user, parent);
    if (parent.cycleType !== "macrocycle") {
      throw new BadRequestException("Este ciclo no es un macrociclo, no tiene hijos.");
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
    await this.assertAccess(user, cycle);

    return cycle;
  }

  // Una plantilla (athleteId nulo) solo la ve su coach dueño y no exige relación
  // activa: no hay atleta. Un atleta nunca la ve.
  private async assertAccess(
    user: AuthenticatedUser,
    cycle: { coachId: string; athleteId: string | null },
  ): Promise<void> {
    const isOwner = user.role === "coach" ? cycle.coachId === user.id : cycle.athleteId === user.id;
    if (!isOwner) {
      throw new ForbiddenException("No tienes acceso a este ciclo.");
    }
    // El coach además necesita la relación activa; el atleta siempre ve lo suyo.
    if (user.role === "coach" && cycle.athleteId) {
      await assertActiveRelation(this.prisma, user.id, cycle.athleteId);
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
    if (cycle.isTemplate) {
      throw new BadRequestException("Las plantillas se editan en PATCH /cycles/templates/:id.");
    }
    await assertActiveRelation(this.prisma, coachId, athleteIdOf(cycle));

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

  // Plantilla: un ciclo sin atleta que el coach guarda en su Biblioteca. No lleva
  // rutinas dentro; estas se ponen en el calendario del atleta, ya asignada.
  async createTemplate(coachId: string, dto: CreateTemplateDto) {
    return this.prisma.trainingCycle.create({
      data: {
        coachId,
        name: dto.name,
        objective: dto.objective,
        cycleType: dto.cycleType,
        sessionsPerWeek: dto.sessionsPerWeek,
        isTemplate: true,
        templateWeeks: dto.weeks,
        ...templateDates(dto.weeks),
      },
    });
  }

  // Cambiar una plantilla no cambia los ciclos que ya se copiaron de ella.
  async updateTemplate(coachId: string, id: string, dto: UpdateTemplateDto) {
    const template = await this.findOwnTemplate(coachId, id);
    return this.prisma.trainingCycle.update({
      where: { id: template.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.objective !== undefined ? { objective: dto.objective } : {}),
        ...(dto.cycleType !== undefined ? { cycleType: dto.cycleType } : {}),
        ...(dto.sessionsPerWeek !== undefined ? { sessionsPerWeek: dto.sessionsPerWeek } : {}),
        ...(dto.weeks !== undefined ? { templateWeeks: dto.weeks, ...templateDates(dto.weeks) } : {}),
      },
    });
  }

  // Asigna una plantilla a un atleta: crea una copia (templateId) con fechas
  // reales a partir de startDate. La plantilla no cambia.
  async assign(coachId: string, id: string, dto: AssignCycleDto) {
    const template = await this.findOwnTemplate(coachId, id);
    await assertActiveRelation(this.prisma, coachId, dto.athleteId);

    const startDate = startOfUtcDay(new Date(dto.startDate));
    const weeks = template.templateWeeks ?? 1;
    const cycle = await this.prisma.trainingCycle.create({
      data: {
        coachId,
        athleteId: dto.athleteId,
        name: template.name,
        objective: template.objective,
        cycleType: template.cycleType,
        sessionsPerWeek: template.sessionsPerWeek,
        templateId: template.id,
        startDate,
        endDate: endDateForWeeks(startDate, weeks),
      },
    });
    this.activity.planCreated(coachId, cycle);
    return cycle;
  }

  private async findOwnTemplate(coachId: string, id: string) {
    const template = await this.prisma.trainingCycle.findUnique({ where: { id } });
    if (!template) {
      throw new NotFoundException("Ciclo no encontrado.");
    }
    if (template.coachId !== coachId) {
      throw new ForbiddenException("Solo el coach dueño puede usar esta plantilla.");
    }
    if (!template.isTemplate) {
      throw new BadRequestException("Este ciclo no es una plantilla.");
    }
    return template;
  }
}
