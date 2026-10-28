import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Notification, NotificationType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { chileDayLabel } from "../activity/chile-time";

// Avisos dentro de la app. Diseño y reglas: docs/diseno/notificaciones/README.md.
//
// Privacidad (R7): el payload solo lleva nombres y el día; nunca cargas,
// esfuerzo, dolor, notas ni peso corporal. Los textos se arman en el cliente.

const DELAY_MS = 10 * 60 * 1000;
const LIST_LIMIT = 20;
const KEEP_MAX = 50;
const KEEP_DAYS = 30;

export type LoggedOutcome = "completed" | "partial" | "skipped";

export interface NotificationView {
  id: string;
  type: NotificationType;
  planId: string | null;
  sessionId: string | null;
  count: number;
  payload: Prisma.JsonValue;
  read: boolean;
  createdAt: Date;
  // La hora que se muestra: la del último cambio que entró al aviso.
  at: Date;
}

interface Upsert {
  userId: string;
  type: NotificationType;
  groupKey: string;
  planId?: string;
  sessionId?: string;
  payload: Prisma.InputJsonObject;
  delay: boolean;
}

function dayLabelOf(date: Date | null): string | null {
  return date ? chileDayLabel(date.toISOString().slice(0, 10)) : null;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---- Lectura (atleta y coach) ----

  async list(userId: string): Promise<NotificationView[]> {
    const now = new Date();
    const since = new Date(now.getTime() - KEEP_DAYS * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.notification.findMany({
      where: { userId, visibleAt: { lte: now }, createdAt: { gte: since } },
      orderBy: { visibleAt: "desc" },
      take: LIST_LIMIT,
    });
    return rows.map(toView);
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { userId, readAt: null, visibleAt: { lte: new Date() } },
    });
    return { count };
  }

  async markRead(userId: string, id: string): Promise<void> {
    const found = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!found) {
      throw new NotFoundException("Aviso no encontrado.");
    }
    if (!found.readAt) {
      await this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
    }
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null, visibleAt: { lte: new Date() } },
      data: { readAt: new Date() },
    });
  }

  // ---- Eventos del coach que avisan al atleta ----

  // El coach agregó o cambió algo en una sesión. Solo avisa si la sesión sigue
  // pendiente y sin series registradas, y si el plan ya tiene ejercicios.
  coachEditedSession(sessionId: string, kind: "added" | "changed"): void {
    this.safely("coachEditedSession", async () => {
      const session = await this.prisma.trainingSession.findUnique({
        where: { id: sessionId },
        include: { cycle: { include: { coach: true } } },
      });
      if (!session || session.deletedAt || session.status !== "pending") return;
      const { cycle } = session;
      if (cycle.status !== "active" || cycle.cycleType === "macrocycle") return;

      const logged = await this.prisma.exerciseLog.count({ where: { sessionExercise: { sessionId } } });
      if (logged > 0) return;
      const exercises = await this.prisma.sessionExercise.count({ where: { session: { cycleId: cycle.id, deletedAt: null } } });
      if (exercises === 0) return;

      if (!cycle.athleteId) return;
      const userId = cycle.athleteId;
      const payload = {
        coachName: cycle.coach.name,
        planName: cycle.name,
        routineName: session.name,
        dayLabel: dayLabelOf(session.scheduledDate),
      };

      // Plan nuevo: una sola vez por plan, cuando ya tiene contenido.
      const assigned = await this.prisma.notification.findFirst({
        where: { userId, type: "plan_assigned", planId: cycle.id },
      });
      if (!assigned) {
        await this.upsert({
          userId,
          type: "plan_assigned",
          groupKey: `plan_assigned:${cycle.id}`,
          planId: cycle.id,
          payload,
          delay: true,
        });
        return;
      }

      // Si hay un aviso del plan que aún no se muestra, este cambio es parte
      // de la misma tanda: solo se mueve la espera.
      const pending = await this.prisma.notification.findFirst({
        where: { userId, planId: cycle.id, readAt: null, visibleAt: { gt: new Date() } },
      });
      if (pending) {
        await this.prisma.notification.update({
          where: { id: pending.id },
          data: { visibleAt: new Date(Date.now() + DELAY_MS), payload },
        });
        return;
      }

      await this.upsert({
        userId,
        type: kind === "added" ? "session_added" : "session_changed",
        groupKey: `changes:${cycle.id}`,
        planId: cycle.id,
        sessionId,
        payload,
        delay: true,
      });
    });
  }

  // ---- Eventos del atleta que avisan al coach ----

  // El atleta eligió o movió el día de una sesión (quitarlo no avisa).
  athleteScheduledSession(sessionId: string): void {
    this.safely("athleteScheduledSession", async () => {
      const session = await this.prisma.trainingSession.findUnique({
        where: { id: sessionId },
        include: { cycle: { include: { athlete: true } } },
      });
      if (!session?.scheduledDate) return;
      const { cycle } = session;
      if (!cycle.athleteId || !cycle.athlete) return;
      if (!(await this.hasActiveRelation(cycle.coachId, cycle.athleteId))) return;

      const groupKey = `scheduled:${cycle.athleteId}:${cycle.id}`;
      const existing = await this.findUnread(cycle.coachId, groupKey);
      const sessionIds = new Set<string>(sessionIdsOf(existing?.payload));
      sessionIds.add(sessionId);

      await this.upsert(
        {
          userId: cycle.coachId,
          type: "session_scheduled",
          groupKey,
          planId: cycle.id,
          sessionId,
          payload: {
            athleteId: cycle.athleteId,
            athleteName: cycle.athlete.name,
            planName: cycle.name,
            routineName: session.name,
            dayLabel: dayLabelOf(session.scheduledDate),
            sessionIds: [...sessionIds],
          },
          delay: true,
        },
        sessionIds.size,
      );
    });
  }

  // El atleta cerró una sesión (completada u omitida). Sin espera.
  athleteClosedSession(sessionId: string, outcome: "completed" | "skipped"): void {
    this.safely("athleteClosedSession", async () => {
      const session = await this.prisma.trainingSession.findUnique({
        where: { id: sessionId },
        include: { cycle: { include: { athlete: true } }, sessionExercises: { select: { id: true } } },
      });
      if (!session) return;
      const { cycle } = session;
      if (!cycle.athleteId || !cycle.athlete) return;
      if (!(await this.hasActiveRelation(cycle.coachId, cycle.athleteId))) return;

      let result: LoggedOutcome = outcome;
      if (outcome === "completed") {
        // "Una parte": quedaron ejercicios sin ninguna serie registrada.
        const withLogs = await this.prisma.exerciseLog.findMany({
          where: { sessionExerciseId: { in: session.sessionExercises.map((e) => e.id) }, active: 1 },
          select: { sessionExerciseId: true },
          distinct: ["sessionExerciseId"],
        });
        if (withLogs.length < session.sessionExercises.length) result = "partial";
      }

      const userId = cycle.coachId;
      const groupKey = `logged:${cycle.athleteId}`;
      const unread = await this.findUnread(userId, groupKey);
      const sessionIds = new Set<string>(sessionIdsOf(unread?.payload));
      sessionIds.add(sessionId);
      const payload = {
        athleteId: cycle.athleteId,
        athleteName: cycle.athlete.name,
        planName: cycle.name,
        routineName: session.name,
        outcome: result,
        sessionIds: [...sessionIds],
      };

      // Cerrar otra vez la misma sesión actualiza su aviso, leído o no.
      const same = await this.prisma.notification.findFirst({
        where: { userId, type: "session_logged", sessionId },
      });
      if (same) {
        await this.prisma.notification.update({
          where: { id: same.id },
          data: { payload, readAt: null, visibleAt: new Date() },
        });
        return;
      }

      await this.upsert(
        { userId, type: "session_logged", groupKey, planId: cycle.id, sessionId, payload, delay: false },
        sessionIds.size,
      );
    });
  }

  // ---- Interno ----

  // Crea el aviso o lo fusiona con uno sin leer de la misma clave. Los cambios
  // a menos de 10 minutos del anterior son la misma tanda: no suman al número.
  // `total` fija el número cuando se cuenta algo distinto de los cambios.
  private async upsert(input: Upsert, total?: number): Promise<void> {
    const now = new Date();
    const existing = await this.findUnread(input.userId, input.groupKey);

    if (!existing) {
      await this.prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          groupKey: input.groupKey,
          planId: input.planId,
          sessionId: input.sessionId,
          payload: input.payload,
          count: total ?? 1,
          visibleAt: input.delay ? new Date(now.getTime() + DELAY_MS) : now,
        },
      });
      await this.prune(input.userId);
      return;
    }

    const visible = existing.visibleAt <= now;
    const sameBurst = now.getTime() - existing.updatedAt.getTime() < DELAY_MS;
    const nextCount = total ?? (sameBurst ? existing.count : existing.count + 1);
    const grouped = nextCount > 1;

    await this.prisma.notification.update({
      where: { id: existing.id },
      data: {
        count: nextCount,
        payload: input.payload,
        // Con varios cambios el aviso abre el plan, no una sesión.
        sessionId: grouped ? null : input.sessionId,
        type: grouped && existing.type === "session_added" ? "session_changed" : existing.type,
        visibleAt: visible ? (sameBurst && total === undefined ? existing.visibleAt : now) : new Date(now.getTime() + DELAY_MS),
      },
    });
  }

  private findUnread(userId: string, groupKey: string): Promise<Notification | null> {
    return this.prisma.notification.findFirst({ where: { userId, groupKey, readAt: null } });
  }

  // Retención: 30 días y máximo 50 por persona.
  private async prune(userId: string): Promise<void> {
    const since = new Date(Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000);
    await this.prisma.notification.deleteMany({ where: { userId, createdAt: { lt: since } } });
    const extra = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: KEEP_MAX,
      select: { id: true },
    });
    if (extra.length > 0) {
      await this.prisma.notification.deleteMany({ where: { id: { in: extra.map((n) => n.id) } } });
    }
  }

  private async hasActiveRelation(coachId: string, athleteId: string): Promise<boolean> {
    const relation = await this.prisma.coachAthlete.findUnique({
      where: { coachId_athleteId: { coachId, athleteId } },
    });
    return relation?.status === "active";
  }

  // Un fallo al avisar nunca debe romper la acción que lo originó.
  private safely(name: string, fn: () => Promise<void>): void {
    fn().catch((error: unknown) => {
      this.logger.warn(`${name} falló: ${error instanceof Error ? error.message : String(error)}`);
    });
  }
}

function sessionIdsOf(payload: Prisma.JsonValue | undefined): string[] {
  if (payload && typeof payload === "object" && !Array.isArray(payload) && Array.isArray(payload.sessionIds)) {
    return payload.sessionIds.filter((id): id is string => typeof id === "string");
  }
  return [];
}

function toView(n: Notification): NotificationView {
  return {
    id: n.id,
    type: n.type,
    planId: n.planId,
    sessionId: n.sessionId,
    count: n.count,
    payload: n.payload,
    read: n.readAt !== null,
    createdAt: n.createdAt,
    at: n.visibleAt,
  };
}
