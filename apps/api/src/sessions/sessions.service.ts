import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { CURRENT_ONLY } from "../common/training";
import { CreateSessionDto } from "./dto/create-session.dto";
import { UpdateSessionDto } from "./dto/update-session.dto";
import { AddSessionExerciseDto } from "./dto/add-session-exercise.dto";
import { UpdateSessionExerciseDto } from "./dto/update-session-exercise.dto";

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  // Una celda del grid: instancia una rutina de la biblioteca en
  // (weekNumber, slotNumber). Los SessionExercise se copian de la rutina
  // (editables después sin afectar la rutina original) — ver
  // docs/prds/features/PRD-RutinasYProgramacion.md.
  async createSession(coachId: string, cycleId: string, dto: CreateSessionDto) {
    const cycle = await this.prisma.trainingCycle.findUnique({ where: { id: cycleId } });
    if (!cycle) {
      throw new NotFoundException("Ciclo no encontrado.");
    }
    if (cycle.coachId !== coachId) {
      throw new ForbiddenException("No eres el coach de este plan.");
    }
    if (cycle.cycleType === "macrocycle") {
      throw new BadRequestException("Un macrociclo no tiene sesiones propias.");
    }
    if (!cycle.sessionsPerWeek || dto.slotNumber > cycle.sessionsPerWeek) {
      throw new BadRequestException(
        `Este plan tiene ${cycle.sessionsPerWeek ?? 0} sesiones por semana.`,
      );
    }

    const routine = await this.prisma.routine.findUnique({
      where: { id: dto.routineId },
      include: { routineExercises: true },
    });
    if (!routine || routine.coachId !== coachId) {
      throw new BadRequestException("La rutina elegida no está disponible.");
    }

    const existing = await this.prisma.trainingSession.findUnique({
      where: {
        cycleId_weekNumber_slotNumber: {
          cycleId,
          weekNumber: dto.weekNumber,
          slotNumber: dto.slotNumber,
        },
      },
    });
    if (existing) {
      throw new ConflictException("Ya hay una sesión asignada en esa celda del grid.");
    }

    return this.prisma.trainingSession.create({
      data: {
        cycleId,
        name: routine.name,
        weekNumber: dto.weekNumber,
        slotNumber: dto.slotNumber,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
        routineId: routine.id,
        sessionExercises: {
          create: routine.routineExercises.map((re) => ({
            exerciseId: re.exerciseId,
            orderIndex: re.orderIndex,
            targetSets: re.defaultSets,
            targetReps: re.defaultReps,
            targetWeight: re.defaultWeight,
            targetRestSeconds: re.defaultRestSeconds,
            targetRir: re.defaultRir,
          })),
        },
      },
      include: { sessionExercises: { include: { exercise: true }, orderBy: { orderIndex: "asc" } } },
    });
  }

  async listSessions(user: AuthenticatedUser, cycleId: string) {
    const cycle = await this.prisma.trainingCycle.findUnique({ where: { id: cycleId } });
    if (!cycle) {
      throw new NotFoundException("Ciclo no encontrado.");
    }
    this.assertCycleAccess(user, cycle);

    return this.prisma.trainingSession.findMany({
      where: { cycleId },
      orderBy: [{ weekNumber: "asc" }, { slotNumber: "asc" }],
    });
  }

  async getSessionDetail(user: AuthenticatedUser, sessionId: string) {
    const session = await this.prisma.trainingSession.findUnique({
      where: { id: sessionId },
      include: {
        cycle: true,
        sessionExercises: {
          orderBy: { orderIndex: "asc" },
          include: {
            exercise: true,
            // Solo los registros vigentes (los que ninguna corrección reemplazó).
            logs: { where: CURRENT_ONLY, orderBy: { setNumber: "asc" } },
          },
        },
        feedback: { where: CURRENT_ONLY },
      },
    });
    if (!session) {
      throw new NotFoundException("Sesión no encontrada.");
    }
    this.assertCycleAccess(user, session.cycle);

    return session;
  }

  async updateSession(coachId: string, sessionId: string, dto: UpdateSessionDto) {
    const session = await this.getSessionForCoach(sessionId, coachId);

    return this.prisma.trainingSession.update({
      where: { id: session.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.scheduledDate !== undefined ? { scheduledDate: new Date(dto.scheduledDate) } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
  }

  async deleteSession(coachId: string, sessionId: string): Promise<void> {
    const session = await this.getSessionForCoach(sessionId, coachId);
    const exerciseCount = await this.prisma.sessionExercise.count({
      where: { sessionId: session.id },
    });
    if (exerciseCount > 0) {
      throw new ConflictException("Quita los ejercicios de la sesión antes de borrarla.");
    }

    await this.prisma.trainingSession.delete({ where: { id: session.id } });
  }

  async addExercise(coachId: string, sessionId: string, dto: AddSessionExerciseDto) {
    const session = await this.getSessionForCoach(sessionId, coachId);

    const exercise = await this.prisma.exercise.findUnique({ where: { id: dto.exerciseId } });
    const availableToCoach =
      exercise && exercise.isActive && (exercise.createdBy === null || exercise.createdBy === coachId);
    if (!availableToCoach) {
      throw new BadRequestException("El ejercicio elegido no está disponible.");
    }

    // Mismo criterio que en createSession: máximo histórico + 1, no count().
    const { _max } = await this.prisma.sessionExercise.aggregate({
      where: { sessionId: session.id },
      _max: { orderIndex: true },
    });
    const orderIndex = (_max.orderIndex ?? 0) + 1;

    return this.prisma.sessionExercise.create({
      data: {
        sessionId: session.id,
        exerciseId: dto.exerciseId,
        orderIndex,
        targetSets: dto.targetSets,
        targetReps: dto.targetReps,
        targetWeight: dto.targetWeight,
        targetRestSeconds: dto.targetRestSeconds,
        targetRir: dto.targetRir,
      },
      include: { exercise: true },
    });
  }

  async updateExercise(coachId: string, sessionExerciseId: string, dto: UpdateSessionExerciseDto) {
    const sessionExercise = await this.getSessionExerciseForCoach(sessionExerciseId, coachId);

    return this.prisma.sessionExercise.update({
      where: { id: sessionExercise.id },
      data: {
        ...(dto.targetSets !== undefined ? { targetSets: dto.targetSets } : {}),
        ...(dto.targetReps !== undefined ? { targetReps: dto.targetReps } : {}),
        ...(dto.targetWeight !== undefined ? { targetWeight: dto.targetWeight } : {}),
        ...(dto.targetRestSeconds !== undefined ? { targetRestSeconds: dto.targetRestSeconds } : {}),
        ...(dto.targetRir !== undefined ? { targetRir: dto.targetRir } : {}),
      },
      include: { exercise: true },
    });
  }

  async removeExercise(coachId: string, sessionExerciseId: string): Promise<void> {
    const sessionExercise = await this.getSessionExerciseForCoach(sessionExerciseId, coachId);
    const logCount = await this.prisma.exerciseLog.count({
      where: { sessionExerciseId: sessionExercise.id },
    });
    if (logCount > 0) {
      throw new ConflictException(
        "No se puede quitar: el atleta ya registró ejecución de este ejercicio.",
      );
    }

    await this.prisma.sessionExercise.delete({ where: { id: sessionExercise.id } });
  }

  private assertCycleAccess(
    user: AuthenticatedUser,
    cycle: { coachId: string; athleteId: string },
  ): void {
    const isOwnerCoach = user.role === "coach" && cycle.coachId === user.id;
    const isAssignedAthlete = user.role === "athlete" && cycle.athleteId === user.id;
    if (!isOwnerCoach && !isAssignedAthlete) {
      throw new ForbiddenException("No tienes acceso a este plan.");
    }
  }

  private async getSessionForCoach(sessionId: string, coachId: string) {
    const session = await this.prisma.trainingSession.findUnique({
      where: { id: sessionId },
      include: { cycle: true },
    });
    if (!session) {
      throw new NotFoundException("Sesión no encontrada.");
    }
    if (session.cycle.coachId !== coachId) {
      throw new ForbiddenException("No eres el coach de esta sesión.");
    }
    return session;
  }

  private async getSessionExerciseForCoach(sessionExerciseId: string, coachId: string) {
    const sessionExercise = await this.prisma.sessionExercise.findUnique({
      where: { id: sessionExerciseId },
      include: { session: { include: { cycle: true } } },
    });
    if (!sessionExercise) {
      throw new NotFoundException("Ejercicio de sesión no encontrado.");
    }
    if (sessionExercise.session.cycle.coachId !== coachId) {
      throw new ForbiddenException("No eres el coach de esta sesión.");
    }
    return sessionExercise;
  }
}
