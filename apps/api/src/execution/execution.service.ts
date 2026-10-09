import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ActivityNotifier } from "../activity/activity-notifier.service";
import { PrismaService } from "../prisma/prisma.service";
import { CURRENT_FEEDBACK, CURRENT_LOG, parseDay, planWeekAt, startOfUtcDay } from "../common/training";
import { LogSetDto } from "./dto/log-set.dto";
import { SessionFeedbackDto } from "./dto/session-feedback.dto";
import { ScheduleSessionDto } from "./dto/schedule-session.dto";
import { TodayQueryDto } from "./dto/today-query.dto";

// Registro de ejecución del atleta. ExerciseLog y SessionFeedback son
// append-only: aquí solo se crean filas, nunca se actualizan ni se borran.
// Ver docs/prds/features/PRD-EjecucionYSeguimiento.md.
// Los grupos musculares que suman carga en el Resumen. Cardio, "otros" y los
// ejercicios sin grupo quedan fuera.
export const SUMMARY_GROUPS = ["legs", "back", "chest", "shoulders", "glutes", "arms", "core"] as const;
type SummaryGroup = (typeof SUMMARY_GROUPS)[number];

@Injectable()
export class ExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityNotifier,
  ) {}

  // La próxima sesión pendiente de los planes activos del atleta, con lo que
  // ya registró. Null si no tiene nada pendiente. Además devuelve las sesiones
  // pendientes que el atleta asignó para hoy (`query.date`, su día local), y
  // con `query.sessionId` devuelve esa sesión pendiente en vez de la primera.
  async today(athleteId: string, query: TodayQueryDto = {}) {
    const now = new Date();
    const cycles = await this.prisma.trainingCycle.findMany({
      where: { athleteId, status: "active", cycleType: { not: "macrocycle" } },
      orderBy: { startDate: "asc" },
    });
    const usable: typeof cycles = [];
    for (const cycle of cycles) {
      if (await this.hasActiveRelation(cycle.coachId, athleteId)) {
        usable.push(cycle);
      }
    }

    const include = {
      sessionExercises: {
        orderBy: { orderIndex: "asc" as const },
        include: {
          exercise: true,
          logs: { where: CURRENT_LOG, orderBy: { setNumber: "asc" as const } },
        },
      },
    };
    const cycleInfo = (cycle: (typeof cycles)[number]) => ({
      id: cycle.id,
      name: cycle.name,
      currentWeek: planWeekAt(cycle.startDate, now),
    });

    let assignedToday: Array<{ id: string; name: string; cycleId: string; weekNumber: number; slotNumber: number }> = [];
    if (query.date) {
      const day = parseDay(query.date);
      if (!day) {
        throw new BadRequestException("Esa fecha no existe.");
      }
      if (usable.length > 0) {
        assignedToday = await this.prisma.trainingSession.findMany({
          where: { cycleId: { in: usable.map((c) => c.id) }, status: "pending", scheduledDate: day },
          orderBy: [{ weekNumber: "asc" }, { slotNumber: "asc" }],
          select: { id: true, name: true, cycleId: true, weekNumber: true, slotNumber: true },
        });
      }
    }

    if (query.sessionId) {
      const chosen = await this.prisma.trainingSession.findFirst({
        where: { id: query.sessionId, status: "pending", cycleId: { in: usable.map((c) => c.id) } },
        include,
      });
      if (!chosen) {
        throw new NotFoundException("Esa sesión no está pendiente en tus planes activos.");
      }
      const cycle = usable.find((c) => c.id === chosen.cycleId)!;
      return { cycle: cycleInfo(cycle), session: chosen, assignedToday };
    }

    for (const cycle of usable) {
      const session = await this.prisma.trainingSession.findFirst({
        where: { cycleId: cycle.id, status: "pending" },
        orderBy: [{ weekNumber: "asc" }, { slotNumber: "asc" }],
        include,
      });
      if (session) {
        return { cycle: cycleInfo(cycle), session, assignedToday };
      }
    }

    return null;
  }

  // El coach define cuántas sesiones por semana; el atleta elige el día de cada
  // una (puede moverla a otra semana y repetir día entre sesiones, siempre
  // dentro de las fechas del plan). Solo sesiones pendientes.
  async scheduleSession(athleteId: string, sessionId: string, dto: ScheduleSessionDto) {
    const session = await this.getWritableSession(athleteId, sessionId);
    if (session.status !== "pending") {
      throw new BadRequestException("Solo puedes cambiar el día de una sesión pendiente.");
    }
    if (dto.date === undefined) {
      throw new BadRequestException("Indica el día de la sesión, o null para quitarlo.");
    }

    let scheduledDate: Date | null = null;
    if (dto.date !== null) {
      const day = parseDay(dto.date);
      if (!day) {
        throw new BadRequestException("Esa fecha no existe.");
      }
      const first = startOfUtcDay(session.cycle.startDate);
      const last = startOfUtcDay(session.cycle.endDate);
      if (day < first || day > last) {
        throw new BadRequestException("El día debe estar dentro de las fechas del plan.");
      }
      scheduledDate = day;
    }

    return this.prisma.trainingSession.update({
      where: { id: session.id },
      data: { scheduledDate },
    });
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
      if (previous.active !== 1) {
        throw new ConflictException("Ese registro se anuló al reabrir la sesión. Registra la serie de nuevo.");
      }
    } else {
      const current = await this.prisma.exerciseLog.findFirst({
        where: { sessionExerciseId, setNumber: dto.setNumber, ...CURRENT_LOG },
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
      where: { sessionId, ...CURRENT_FEEDBACK },
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
    if (dto.outcome === "completed" && !dto.supersedesId) {
      this.activity.sessionCompleted(athleteId);
    }
    return feedback;
  }

  // Solo el atleta asignado, con relación activa con el coach del plan y el
  // plan en estado activo, puede registrar sobre una sesión.
  // Series y carga (repeticiones × peso) por grupo muscular de cada sesión
  // entrenada de un plan. "Entrenada" = tiene series registradas y no se
  // marcó como no hecha. La fecha es la de la primera serie. Los ejercicios
  // sin peso (plancha, flexiones) suman series pero no kilos.
  async muscleSummary(athleteId: string, cycleId: string) {
    const cycle = await this.prisma.trainingCycle.findUnique({ where: { id: cycleId } });
    if (!cycle) {
      throw new NotFoundException("Plan no encontrado.");
    }
    if (cycle.athleteId !== athleteId) {
      throw new ForbiddenException("Este plan no es tuyo.");
    }

    const sessions = await this.prisma.trainingSession.findMany({
      where: { cycleId, status: { not: "skipped" } },
      orderBy: [{ weekNumber: "asc" }, { slotNumber: "asc" }],
      select: {
        id: true,
        name: true,
        weekNumber: true,
        sessionExercises: {
          select: {
            exercise: { select: { muscleGroup: true } },
            logs: { where: CURRENT_LOG, select: { actualReps: true, actualWeight: true, loggedAt: true } },
          },
        },
      },
    });

    const empty = () => Object.fromEntries(SUMMARY_GROUPS.map((g) => [g, 0])) as Record<SummaryGroup, number>;
    const days = [];
    for (const session of sessions) {
      const sets = empty();
      const kg = empty();
      let trainedAt: Date | null = null;
      let logged = 0;
      for (const item of session.sessionExercises) {
        for (const log of item.logs) {
          logged += 1;
          if (!trainedAt || log.loggedAt < trainedAt) {
            trainedAt = log.loggedAt;
          }
          const group = item.exercise.muscleGroup as SummaryGroup | null;
          if (group && group in sets) {
            sets[group] += 1;
            kg[group] += log.actualReps * (log.actualWeight ?? 0);
          }
        }
      }
      if (logged > 0 && trainedAt) {
        days.push({ sessionId: session.id, name: session.name, weekNumber: session.weekNumber, trainedAt, sets, kg });
      }
    }
    return { cycleId, days };
  }

  // Devuelve una sesión cerrada (hecha o no hecha) a pendiente, como si no se
  // hubiera hecho: el cierre vigente y las series registradas no se borran,
  // quedan inactivos (active = 0) para el historial, y la sesión vuelve a
  // empezar de cero (sin hora de inicio). Después se puede entrenar y cerrar
  // de nuevo.
  async reopenSession(athleteId: string, sessionId: string) {
    const session = await this.getWritableSession(athleteId, sessionId);
    if (session.status === "pending") {
      throw new BadRequestException("Esta sesión ya está pendiente.");
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.trainingSession.update({
        where: { id: sessionId },
        data: { status: "pending", startedAt: null },
      }),
      this.prisma.sessionFeedback.updateMany({
        where: { sessionId, ...CURRENT_FEEDBACK },
        data: { active: 0 },
      }),
      this.prisma.exerciseLog.updateMany({
        where: { sessionExercise: { sessionId }, ...CURRENT_LOG },
        data: { active: 0 },
      }),
    ]);
    return updated;
  }

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
