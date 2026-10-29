import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { CURRENT_FEEDBACK, CURRENT_LOG } from "../common/training";
import { assertActiveRelation, athleteIdOf } from "../common/access";
import { startOfUtcDay } from "../common/training";
import { Prisma } from "@prisma/client";
import { earliestAllowedDay, reassignSlots, weekOfDate } from "./slots";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateSessionDto } from "./dto/create-session.dto";
import { UpdateSessionDto } from "./dto/update-session.dto";
import { DuplicateSessionDto } from "./dto/duplicate-session.dto";
import { AddSessionExerciseDto } from "./dto/add-session-exercise.dto";
import { UpdateSessionExerciseDto } from "./dto/update-session-exercise.dto";

const PURGE_AFTER_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // Instancia una rutina de la biblioteca como una sesión del ciclo. Los
  // SessionExercise se copian de la rutina (editables después sin afectar la
  // rutina original) — ver docs/prds/features/PRD-RutinasYProgramacion.md.
  //
  // Hay dos formas de ubicarla:
  //  - por celda (weekNumber y slotNumber): la grilla anterior, con tope de
  //    «sesiones por semana» y una sola sesión por celda;
  //  - por día (solo scheduledDate): el servidor calcula la semana y el espacio.
  //    Puede haber varias sesiones el mismo día y «sesiones por semana» es una
  //    guía, no un tope (docs/diseno/biblioteca).
  async createSession(coachId: string, cycleId: string, dto: CreateSessionDto) {
    const cycle = await this.prisma.trainingCycle.findUnique({ where: { id: cycleId } });
    if (!cycle) {
      throw new NotFoundException("Ciclo no encontrado.");
    }
    if (cycle.coachId !== coachId) {
      throw new ForbiddenException("No eres el coach de este ciclo.");
    }
    if (cycle.isTemplate) {
      throw new BadRequestException("Una plantilla no tiene sesiones. Asígnala a un atleta primero.");
    }
    await assertActiveRelation(this.prisma, coachId, athleteIdOf(cycle));
    if (cycle.cycleType === "macrocycle") {
      throw new BadRequestException("Un macrociclo no tiene sesiones propias.");
    }

    const routine = await this.prisma.routine.findUnique({
      where: { id: dto.routineId },
      include: { routineExercises: true },
    });
    if (!routine || routine.coachId !== coachId) {
      throw new BadRequestException("La rutina elegida no está disponible.");
    }

    const byCell = dto.weekNumber !== undefined && dto.slotNumber !== undefined;
    if (!byCell && !dto.scheduledDate) {
      throw new BadRequestException("Indica el día de la sesión.");
    }

    const exercises = routine.routineExercises.map((re) => ({
      exerciseId: re.exerciseId,
      orderIndex: re.orderIndex,
      targetSets: re.defaultSets,
      targetReps: re.defaultReps,
      targetWeight: re.defaultWeight,
      targetRestSeconds: re.defaultRestSeconds,
      targetRir: re.defaultRir,
    }));
    const include = { sessionExercises: { include: { exercise: true }, orderBy: { orderIndex: "asc" as const } } };

    let created;
    if (byCell) {
      if (!cycle.sessionsPerWeek || dto.slotNumber! > cycle.sessionsPerWeek) {
        throw new BadRequestException(
          `Este ciclo tiene ${cycle.sessionsPerWeek ?? 0} sesiones por semana.`,
        );
      }
      const existing = await this.prisma.trainingSession.findUnique({
        where: {
          cycleId_weekNumber_slotNumber: {
            cycleId,
            weekNumber: dto.weekNumber!,
            slotNumber: dto.slotNumber!,
          },
        },
      });
      if (existing) {
        throw new ConflictException("Ya hay una sesión asignada en esa celda del grid.");
      }
      created = await this.prisma.trainingSession.create({
        data: {
          cycleId,
          name: routine.name,
          weekNumber: dto.weekNumber!,
          slotNumber: dto.slotNumber!,
          scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
          routineId: routine.id,
          sessionExercises: { create: exercises },
        },
        include,
      });
    } else {
      const day = this.assertDayAllowed(cycle, dto.scheduledDate!, dto.today);
      const weekNumber = weekOfDate(cycle.startDate, day);
      try {
        const id = await this.prisma.$transaction(async (tx) => {
          const last = await tx.trainingSession.findFirst({
            where: { cycleId, weekNumber },
            orderBy: { slotNumber: "desc" },
            select: { slotNumber: true },
          });
          const session = await tx.trainingSession.create({
            data: {
              cycleId,
              name: routine.name,
              weekNumber,
              slotNumber: (last?.slotNumber ?? 0) + 1,
              scheduledDate: day,
              routineId: routine.id,
              sessionExercises: { create: exercises },
            },
            select: { id: true },
          });
          await this.reassignWeekSlots(tx, cycleId, weekNumber);
          return session.id;
        });
        created = await this.prisma.trainingSession.findUniqueOrThrow({ where: { id }, include });
      } catch (error) {
        // Dos sesiones agregadas a la vez pueden pedir el mismo espacio.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new ConflictException("Se estaba agregando otra sesión a la vez. Inténtalo de nuevo.");
        }
        throw error;
      }
    }
    this.notifications.coachEditedSession(created.id, "added");
    return created;
  }

  // La app móvil ordena por (semana, espacio): los espacios de las sesiones con
  // fecha siguen el orden de las fechas (ver reassignSlots). Se pasa por números
  // negativos para no chocar con la restricción única (ciclo, semana, espacio).
  private async reassignWeekSlots(tx: Prisma.TransactionClient, cycleId: string, weekNumber: number) {
    const rows = await tx.trainingSession.findMany({
      where: { cycleId, weekNumber },
      select: { id: true, slotNumber: true, scheduledDate: true },
    });
    const changes = reassignSlots(rows);
    for (const id of changes.keys()) {
      await tx.trainingSession.update({ where: { id }, data: { slotNumber: -rows.find((r) => r.id === id)!.slotNumber } });
    }
    for (const [id, slotNumber] of changes) {
      await tx.trainingSession.update({ where: { id }, data: { slotNumber } });
    }
  }

  async listSessions(user: AuthenticatedUser, cycleId: string) {
    const cycle = await this.prisma.trainingCycle.findUnique({ where: { id: cycleId } });
    if (!cycle) {
      throw new NotFoundException("Ciclo no encontrado.");
    }
    await this.assertCycleAccess(user, cycle);

    return this.prisma.trainingSession.findMany({
      where: { cycleId, deletedAt: null },
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
            logs: { where: CURRENT_LOG, orderBy: { setNumber: "asc" } },
          },
        },
        feedback: { where: CURRENT_FEEDBACK },
      },
    });
    if (!session || session.deletedAt) {
      throw new NotFoundException("Sesión no encontrada.");
    }
    await this.assertCycleAccess(user, session.cycle);

    return session;
  }

  // Día válido para ubicar una sesión: dentro del ciclo y desde hoy (las sesiones
  // no se asignan a días que ya pasaron). Devuelve el día recortado a medianoche UTC.
  private assertDayAllowed(cycle: { startDate: Date; endDate: Date }, scheduledDate: string, today?: string): Date {
    const day = startOfUtcDay(new Date(scheduledDate));
    if (day < startOfUtcDay(cycle.startDate) || day > startOfUtcDay(cycle.endDate)) {
      throw new BadRequestException("Ese día queda fuera del ciclo.");
    }
    const earliest = earliestAllowedDay(new Date(), today);
    if (!earliest) {
      throw new BadRequestException("La fecha de hoy no es válida.");
    }
    if (day < earliest) {
      throw new BadRequestException("Solo puedes asignar sesiones desde hoy en adelante.");
    }
    return day;
  }

  // Una sesión con series registradas o cierre del atleta es historia: no se
  // mueve (regla R7). Las omitidas llevan cierre, así que tampoco se mueven.
  private async assertNoExecution(sessionId: string, message: string) {
    const [logs, feedback] = await Promise.all([
      this.prisma.exerciseLog.count({ where: { sessionExercise: { sessionId } } }),
      this.prisma.sessionFeedback.count({ where: { sessionId } }),
    ]);
    if (logs > 0 || feedback > 0) {
      throw new ConflictException(message);
    }
  }

  async updateSession(coachId: string, sessionId: string, dto: UpdateSessionDto) {
    const session = await this.getSessionForCoach(sessionId, coachId);

    const currentDay = session.scheduledDate ? startOfUtcDay(session.scheduledDate) : null;
    const requestedDay = dto.scheduledDate !== undefined ? startOfUtcDay(new Date(dto.scheduledDate)) : null;
    const moves = requestedDay !== null && requestedDay.getTime() !== currentDay?.getTime();

    const data: Prisma.TrainingSessionUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    };

    let updated;
    if (moves) {
      if (session.status !== "pending") {
        throw new ConflictException("Solo se mueve una sesión pendiente.");
      }
      await this.assertNoExecution(session.id, "No se puede mover: el atleta ya registró esta sesión.");
      const day = this.assertDayAllowed(session.cycle, dto.scheduledDate!, dto.today);
      const weekNumber = weekOfDate(session.cycle.startDate, day);
      try {
        updated = await this.prisma.$transaction(async (tx) => {
          let slotNumber = session.slotNumber;
          if (weekNumber !== session.weekNumber) {
            // Los espacios de las sesiones quitadas siguen ocupados.
            const last = await tx.trainingSession.findFirst({
              where: { cycleId: session.cycleId, weekNumber },
              orderBy: { slotNumber: "desc" },
              select: { slotNumber: true },
            });
            slotNumber = (last?.slotNumber ?? 0) + 1;
          }
          await tx.trainingSession.update({
            where: { id: session.id },
            data: { ...data, scheduledDate: day, weekNumber, slotNumber },
          });
          await this.reassignWeekSlots(tx, session.cycleId, weekNumber);
          if (weekNumber !== session.weekNumber) {
            await this.reassignWeekSlots(tx, session.cycleId, session.weekNumber);
          }
          return tx.trainingSession.findUniqueOrThrow({ where: { id: session.id } });
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new ConflictException("Se estaba moviendo otra sesión a la vez. Inténtalo de nuevo.");
        }
        throw error;
      }
    } else {
      updated = await this.prisma.trainingSession.update({ where: { id: session.id }, data });
    }
    if (dto.name !== undefined || moves) {
      this.notifications.coachEditedSession(session.id, "changed");
    }
    return updated;
  }

  // «Quitar» de la pizarra: borrado lógico (se restaura con restoreSession). Una
  // sesión hecha o con series registradas no se quita; una omitida sí, pero queda
  // oculta para siempre (su cierre es historia del atleta).
  async deleteSession(coachId: string, sessionId: string): Promise<void> {
    const session = await this.getSessionForCoach(sessionId, coachId, true);
    if (session.deletedAt) return;
    if (session.status === "completed") {
      throw new ConflictException("No se puede quitar una sesión que el atleta ya completó.");
    }
    const logs = await this.prisma.exerciseLog.count({ where: { sessionExercise: { sessionId: session.id } } });
    if (logs > 0) {
      throw new ConflictException("No se puede quitar: el atleta ya registró ejecución de esta sesión.");
    }

    await this.prisma.trainingSession.update({ where: { id: session.id }, data: { deletedAt: new Date() } });
    await this.purgeDeleted(session.cycleId);
  }

  async restoreSession(coachId: string, sessionId: string) {
    const session = await this.getSessionForCoach(sessionId, coachId, true);
    if (!session.deletedAt) return session;
    return this.prisma.$transaction(async (tx) => {
      await tx.trainingSession.update({ where: { id: session.id }, data: { deletedAt: null } });
      await this.reassignWeekSlots(tx, session.cycleId, session.weekNumber);
      return tx.trainingSession.findUniqueOrThrow({
        where: { id: session.id },
        include: { sessionExercises: { include: { exercise: true }, orderBy: { orderIndex: "asc" } } },
      });
    });
  }

  // Copia la sesión tal como quedó (ejercicios ajustados incluidos) como una
  // sesión pendiente, sin series ni cierre, en otro día.
  async duplicateSession(coachId: string, sessionId: string, dto: DuplicateSessionDto) {
    const session = await this.getSessionForCoach(sessionId, coachId);
    const day = this.assertDayAllowed(session.cycle, dto.scheduledDate, dto.today);
    const weekNumber = weekOfDate(session.cycle.startDate, day);
    const exercises = await this.prisma.sessionExercise.findMany({
      where: { sessionId: session.id },
      orderBy: { orderIndex: "asc" },
    });
    try {
      const id = await this.prisma.$transaction(async (tx) => {
        const last = await tx.trainingSession.findFirst({
          where: { cycleId: session.cycleId, weekNumber },
          orderBy: { slotNumber: "desc" },
          select: { slotNumber: true },
        });
        const copy = await tx.trainingSession.create({
          data: {
            cycleId: session.cycleId,
            name: session.name,
            weekNumber,
            slotNumber: (last?.slotNumber ?? 0) + 1,
            scheduledDate: day,
            routineId: session.routineId,
            sessionExercises: {
              create: exercises.map((e) => ({
                exerciseId: e.exerciseId,
                orderIndex: e.orderIndex,
                targetSets: e.targetSets,
                targetReps: e.targetReps,
                targetWeight: e.targetWeight,
                targetRestSeconds: e.targetRestSeconds,
                targetRir: e.targetRir,
              })),
            },
          },
          select: { id: true },
        });
        await this.reassignWeekSlots(tx, session.cycleId, weekNumber);
        return copy.id;
      });
      this.notifications.coachEditedSession(id, "added");
      return this.prisma.trainingSession.findUniqueOrThrow({
        where: { id },
        include: { sessionExercises: { include: { exercise: true }, orderBy: { orderIndex: "asc" } } },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Se estaba agregando otra sesión a la vez. Inténtalo de nuevo.");
      }
      throw error;
    }
  }

  // Sin tarea programada: al quitar una sesión se destruyen las quitadas hace más
  // de 24 horas en ese ciclo que no tengan series ni cierre. Las que sí los
  // tienen se quedan ocultas (regla R7).
  private async purgeDeleted(cycleId: string) {
    const cutoff = new Date(Date.now() - PURGE_AFTER_MS);
    const stale = await this.prisma.trainingSession.findMany({
      where: {
        cycleId,
        deletedAt: { lt: cutoff },
        feedback: { none: {} },
        sessionExercises: { every: { logs: { none: {} } } },
      },
      select: { id: true },
    });
    if (stale.length === 0) return;
    const ids = stale.map((s) => s.id);
    await this.prisma.$transaction([
      this.prisma.sessionExercise.deleteMany({ where: { sessionId: { in: ids } } }),
      this.prisma.trainingSession.deleteMany({ where: { id: { in: ids } } }),
    ]);
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

    const created = await this.prisma.sessionExercise.create({
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
    this.notifications.coachEditedSession(session.id, "changed");
    return created;
  }

  async updateExercise(coachId: string, sessionExerciseId: string, dto: UpdateSessionExerciseDto) {
    const sessionExercise = await this.getSessionExerciseForCoach(sessionExerciseId, coachId);

    const updated = await this.prisma.sessionExercise.update({
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
    this.notifications.coachEditedSession(sessionExercise.sessionId, "changed");
    return updated;
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
    this.notifications.coachEditedSession(sessionExercise.sessionId, "changed");
  }

  private async assertCycleAccess(
    user: AuthenticatedUser,
    cycle: { coachId: string; athleteId: string | null },
  ): Promise<void> {
    const isOwnerCoach = user.role === "coach" && cycle.coachId === user.id;
    const isAssignedAthlete = user.role === "athlete" && cycle.athleteId === user.id;
    if (!isOwnerCoach && !isAssignedAthlete) {
      throw new ForbiddenException("No tienes acceso a este ciclo.");
    }
    // El coach además necesita la relación activa; el atleta siempre ve lo suyo.
    if (isOwnerCoach && cycle.athleteId) {
      await assertActiveRelation(this.prisma, user.id, cycle.athleteId);
    }
  }

  private async getSessionForCoach(sessionId: string, coachId: string, includeDeleted = false) {
    const session = await this.prisma.trainingSession.findUnique({
      where: { id: sessionId },
      include: { cycle: true },
    });
    if (!session || (session.deletedAt && !includeDeleted)) {
      throw new NotFoundException("Sesión no encontrada.");
    }
    if (session.cycle.coachId !== coachId) {
      throw new ForbiddenException("No eres el coach de esta sesión.");
    }
    await assertActiveRelation(this.prisma, coachId, athleteIdOf(session.cycle));
    return session;
  }

  private async getSessionExerciseForCoach(sessionExerciseId: string, coachId: string) {
    const sessionExercise = await this.prisma.sessionExercise.findUnique({
      where: { id: sessionExerciseId },
      include: { session: { include: { cycle: true } } },
    });
    if (!sessionExercise || sessionExercise.session.deletedAt) {
      throw new NotFoundException("Ejercicio de sesión no encontrado.");
    }
    if (sessionExercise.session.cycle.coachId !== coachId) {
      throw new ForbiddenException("No eres el coach de esta sesión.");
    }
    await assertActiveRelation(this.prisma, coachId, athleteIdOf(sessionExercise.session.cycle));
    return sessionExercise;
  }
}
