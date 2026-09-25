import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CURRENT_ONLY, planWeekAt } from "../common/training";
import { LogSetDto } from "./dto/log-set.dto";
import { SessionFeedbackDto } from "./dto/session-feedback.dto";

// Registro de ejecución del atleta. ExerciseLog y SessionFeedback son
// append-only: aquí solo se crean filas, nunca se actualizan ni se borran.
// Ver docs/prds/features/PRD-EjecucionYSeguimiento.md.
@Injectable()
export class ExecutionService {
  constructor(private readonly prisma: PrismaService) {}

  // La próxima sesión pendiente de los planes activos del atleta, con lo que
  // ya registró. Null si no tiene nada pendiente.
  async today(athleteId: string) {
    const now = new Date();
    const cycles = await this.prisma.trainingCycle.findMany({
      where: { athleteId, status: "active", cycleType: { not: "macrocycle" } },
      orderBy: { startDate: "asc" },
    });

    for (const cycle of cycles) {
      if (!(await this.hasActiveRelation(cycle.coachId, athleteId))) {
        continue;
      }
      const session = await this.prisma.trainingSession.findFirst({
        where: { cycleId: cycle.id, status: "pending" },
        orderBy: [{ weekNumber: "asc" }, { slotNumber: "asc" }],
        include: {
          sessionExercises: {
            orderBy: { orderIndex: "asc" },
            include: {
              exercise: true,
              logs: { where: CURRENT_ONLY, orderBy: { setNumber: "asc" } },
            },
          },
        },
      });
      if (session) {
        return {
          cycle: { id: cycle.id, name: cycle.name, currentWeek: planWeekAt(cycle.startDate, now) },
          session,
        };
      }
    }

    return null;
  }

  async startSession(athleteId: string, sessionId: string) {
    const session = await this.getWritableSession(athleteId, sessionId);
    if (session.startedAt) {
      return session;
    }
    return this.prisma.trainingSession.update({
      where: { id: session.id },
      data: { startedAt: new Date() },
    });
  }

  async logSet(athleteId: string, sessionExerciseId: string, dto: LogSetDto) {
    // Reintento: el mismo id ya se guardó, se devuelve tal cual.
    const replay = await this.prisma.exerciseLog.findUnique({ where: { id: dto.id } });
    if (replay) {
      if (replay.athleteId !== athleteId || replay.sessionExerciseId !== sessionExerciseId) {
        throw new ConflictException("Ese id de registro ya está en uso.");
      }
      return replay;
    }

    const sessionExercise = await this.prisma.sessionExercise.findUnique({
      where: { id: sessionExerciseId },
    });
    if (!sessionExercise) {
      throw new NotFoundException("Ejercicio de sesión no encontrado.");
    }
    const session = await this.getWritableSession(athleteId, sessionExercise.sessionId);

    if (dto.supersedesId) {
      const previous = await this.prisma.exerciseLog.findUnique({
        where: { id: dto.supersedesId },
        include: { supersededBy: true },
      });
      if (!previous || previous.athleteId !== athleteId || previous.sessionExerciseId !== sessionExerciseId) {
        throw new BadRequestException("El registro que quieres corregir no existe en este ejercicio.");
      }
      if (previous.supersededBy) {
        throw new ConflictException("Ese registro ya fue corregido. Corrige la versión más reciente.");
      }
    } else {
      const current = await this.prisma.exerciseLog.findFirst({
        where: { sessionExerciseId, setNumber: dto.setNumber, ...CURRENT_ONLY },
      });
      if (current) {
        throw new ConflictException(
          `Ya registraste la serie ${dto.setNumber}. Para cambiarla, envía una corrección.`,
        );
      }
    }

    const [log] = await this.prisma.$transaction([
      this.prisma.exerciseLog.create({
        data: {
          id: dto.id,
          sessionExerciseId,
          athleteId,
          setNumber: dto.setNumber,
          actualReps: dto.actualReps,
          actualWeight: dto.actualWeight,
          rir: dto.rir,
          supersedesId: dto.supersedesId,
        },
      }),
      // La primera serie registrada también cuenta como inicio de la sesión.
      ...(session.startedAt
        ? []
        : [
            this.prisma.trainingSession.update({
              where: { id: session.id },
              data: { startedAt: new Date() },
            }),
          ]),
    ]);
    return log;
  }

  async submitFeedback(athleteId: string, sessionId: string, dto: SessionFeedbackDto) {
    const session = await this.getWritableSession(athleteId, sessionId);
    const current = await this.prisma.sessionFeedback.findFirst({
      where: { sessionId, ...CURRENT_ONLY },
    });

    if (dto.supersedesId) {
      if (!current || current.id !== dto.supersedesId) {
        throw new ConflictException("Solo puedes corregir el cierre más reciente de esta sesión.");
      }
    } else if (current) {
      throw new ConflictException("Ya cerraste esta sesión. Para cambiar el cierre, envía una corrección.");
    }

    let durationMinutes = dto.durationMinutes;
    if (dto.outcome === "completed") {
      if (dto.srpe === undefined) {
        throw new BadRequestException("Indica qué tan dura fue la sesión (0 a 10).");
      }
      if (durationMinutes === undefined && session.startedAt) {
        const minutes = Math.round((Date.now() - session.startedAt.getTime()) / 60000);
        durationMinutes = Math.min(Math.max(minutes, 1), 600);
      }
      if (durationMinutes === undefined) {
        throw new BadRequestException("Indica cuántos minutos duró la sesión.");
      }
    }

    const [feedback] = await this.prisma.$transaction([
      this.prisma.sessionFeedback.create({
        data: {
          sessionId,
          athleteId,
          outcome: dto.outcome,
          srpe: dto.outcome === "completed" ? dto.srpe : null,
          durationMinutes: dto.outcome === "completed" ? durationMinutes : null,
          pain: dto.pain ?? false,
          painNotes: dto.pain ? dto.painNotes : null,
          notes: dto.notes,
          supersedesId: dto.supersedesId,
        },
      }),
      this.prisma.trainingSession.update({
        where: { id: sessionId },
        data: { status: dto.outcome },
      }),
    ]);
    return feedback;
  }

  // Solo el atleta asignado, con relación activa con el coach del plan y el
  // plan en estado activo, puede registrar sobre una sesión.
  private async getWritableSession(athleteId: string, sessionId: string) {
    const session = await this.prisma.trainingSession.findUnique({
      where: { id: sessionId },
      include: { cycle: true },
    });
    if (!session) {
      throw new NotFoundException("Sesión no encontrada.");
    }
    if (session.cycle.athleteId !== athleteId) {
      throw new ForbiddenException("Esta sesión no es tuya.");
    }
    if (!(await this.hasActiveRelation(session.cycle.coachId, athleteId))) {
      throw new ForbiddenException("Ya no tienes una relación activa con el coach de este plan.");
    }
    if (session.cycle.status !== "active") {
      throw new BadRequestException("Solo puedes registrar sesiones de un plan activo.");
    }
    return session;
  }

  private async hasActiveRelation(coachId: string, athleteId: string): Promise<boolean> {
    const relation = await this.prisma.coachAthlete.findUnique({
      where: { coachId_athleteId: { coachId, athleteId } },
    });
    return relation?.status === "active";
  }
}
