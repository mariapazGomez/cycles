import { ConflictException, GoneException, Injectable, Logger, NotFoundException, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PilotInvitation, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { generateRawToken, hashToken } from "../auth/token.util";
import { chileDate, chileDayRange } from "../activity/chile-time";
import { DAILY_CAP, expiryFrom, invitationState, InvitationState, purgeBefore, queueDay, queueWindowOpen, STALE_SENDING_MS, contactNoticeSince } from "./invitation-rules";

export const SENDING_OFF_MESSAGE = "El envío de invitaciones todavía no está activado.";
export const INVITATION_GONE_MESSAGE = "Esta invitación ya no sirve.";

// Número fijo del bloqueo de la base que ordena quién toma cupo: así dos clics, o
// un clic y la cola, nunca mandan dos veces ni pasan el tope.
const LOCK_KEY = 295_001;
const TICK_MS = 10 * 60 * 1000;
// Resend admite pocos envíos por segundo.
const PAUSE_MS = 600;

export interface InvitationRow {
  email: string;
  // Cuántas veces escribió y su último mensaje (null si ya se purgó).
  messages: number;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  beforeNewNotice: boolean;
  state: InvitationState;
  invitationId: string | null;
  queuedAt: Date | null;
  // Solo en cola: desde qué día sale (AAAA-MM-DD de Chile).
  queuedFor: string | null;
  sentAt: Date | null;
  expiresAt: Date | null;
  usedAt: Date | null;
}

// Invitaciones a registrarse que el equipo envía desde admin (CYC-295). Apagado
// salvo INVITATIONS_ENABLED=true. Nada de esto registra correos ni enlaces.
@Injectable()
export class InvitationsService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(InvitationsService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  get enabled(): boolean {
    return this.config.get<string>("INVITATIONS_ENABLED")?.trim() === "true";
  }

  // Respaldo de la llamada externa: mientras la API esté despierta, la cola se
  // revisa cada 10 minutos y al arrancar.
  onApplicationBootstrap(): void {
    if (this.config.get<string>("NODE_ENV") !== "production") return;
    const tick = () => void this.runQueue().catch((err) => this.logger.error(`Falló la cola de invitaciones: ${errorName(err)}`));
    tick();
    this.timer = setInterval(tick, TICK_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async list(now = new Date()): Promise<{ enabled: boolean; sentToday: number; dailyCap: number; items: InvitationRow[] }> {
    const [messages, invitations, usedToday] = await Promise.all([
      this.prisma.contactRequest.findMany({ orderBy: { createdAt: "desc" }, select: { email: true, message: true, createdAt: true } }),
      this.prisma.pilotInvitation.findMany(),
      this.usedToday(this.prisma, now),
    ]);
    // Una fila por correo, aunque haya escrito más de una vez.
    const byEmail = new Map<string, { count: number; message: string | null; at: Date | null }>();
    for (const m of messages) {
      const found = byEmail.get(m.email);
      if (found) found.count += 1;
      else byEmail.set(m.email, { count: 1, message: m.message, at: m.createdAt });
    }
    for (const i of invitations) if (!byEmail.has(i.email)) byEmail.set(i.email, { count: 0, message: null, at: null });

    const accounts = new Set(
      (await this.prisma.user.findMany({ where: { email: { in: [...byEmail.keys()] } }, select: { email: true } })).map((u) => u.email),
    );
    const invitationOf = new Map(invitations.map((i) => [i.email, i]));
    const queue = invitations.filter((i) => i.status === "queued").sort(byQueueOrder);
    const noticeSince = contactNoticeSince(this.config.get<string>("CONTACT_NOTICE_SINCE"));
    const items = [...byEmail.entries()].map(([email, info]) => {
      const invitation = invitationOf.get(email) ?? null;
      const state = invitationState(invitation, accounts.has(email), now);
      return {
        email,
        messages: info.count,
        lastMessage: info.message,
        lastMessageAt: info.at,
        beforeNewNotice: info.at !== null && (noticeSince === null || info.at < noticeSince),
        state,
        invitationId: invitation?.id ?? null,
        queuedAt: invitation?.queuedAt ?? null,
        queuedFor: state === "queued" ? queueDay(queue.findIndex((q) => q.email === email), usedToday, now.getTime()) : null,
        sentAt: invitation?.sentAt ?? null,
        expiresAt: invitation?.expiresAt ?? null,
        usedAt: invitation?.usedAt ?? null,
      };
    });
    items.sort((a, b) => (b.lastMessageAt?.getTime() ?? 0) - (a.lastMessageAt?.getTime() ?? 0));
    return { enabled: this.enabled, sentToday: usedToday, dailyCap: DAILY_CAP, items };
  }

  // El clic del equipo: envía ahora si queda cupo, o deja en cola. Sirve para la
  // primera vez, para «Enviar de nuevo» (vencida) y para «Reintentar» (error).
  async request(email: string, requestedBy: string, now = new Date()): Promise<{ id: string; state: "sent" | "queued" | "failed" | "sending" }> {
    if (!this.enabled) throw new ConflictException(SENDING_OFF_MESSAGE);
    const decision = await this.locked(async (tx) => {
      if (await tx.user.findUnique({ where: { email }, select: { id: true } })) {
        throw new ConflictException("Ese correo ya tiene cuenta.");
      }
      const current = await tx.pilotInvitation.findUnique({ where: { email } });
      if (!current && !(await tx.contactRequest.findFirst({ where: { email }, select: { id: true } }))) {
        throw new NotFoundException("No hay un mensaje de ese correo.");
      }
      // Repetir el clic no cambia nada.
      if (current?.status === "queued" || current?.status === "sending") return { row: current, send: false };
      if (current?.status === "used" || (current?.status === "sent" && current.expiresAt && current.expiresAt > now)) {
        throw new ConflictException("Ya se envió una invitación a este correo.");
      }
      // Lo que está en cola tiene reservado el cupo: un clic nuevo no se adelanta.
      const taken = (await this.usedToday(tx, now)) + (await tx.pilotInvitation.count({ where: { status: "queued" } }));
      const send = taken < DAILY_CAP;
      const data = send
        ? { status: "sending" as const, attemptedAt: now, queuedAt: null, requestedBy }
        : { status: "queued" as const, queuedAt: now, requestedBy };
      const row = await tx.pilotInvitation.upsert({ where: { email }, create: { email, createdAt: now, ...data }, update: data });
      return { row, send };
    });
    if (!decision.send) return { id: decision.row.id, state: decision.row.status === "sending" ? "sending" : "queued" };
    return { id: decision.row.id, state: await this.deliver(decision.row, now) };
  }

  // «Quitar de la cola»: si nunca salió, vuelve a «Sin invitar»; si era una
  // vencida, vuelve a «Vencida».
  async unqueue(id: string): Promise<void> {
    await this.locked(async (tx) => {
      const row = await tx.pilotInvitation.findUnique({ where: { id } });
      if (!row || row.status !== "queued") throw new NotFoundException("Esa invitación ya no está en la cola.");
      if (row.sentAt) await tx.pilotInvitation.update({ where: { id }, data: { status: "sent", queuedAt: null } });
      else await tx.pilotInvitation.delete({ where: { id } });
    });
  }

  // La tarea de la cola. Se puede llamar las veces que sea: borra lo que cumplió
  // 12 meses y, dentro del horario, envía lo que quepa en el cupo del día.
  async runQueue(now = new Date()): Promise<{ purged: number; sent: number; failed: number }> {
    const purged = (await this.prisma.pilotInvitation.deleteMany({ where: { createdAt: { lt: purgeBefore(now) } } })).count;
    const result = { purged, sent: 0, failed: 0 };
    if (!this.enabled) return result;
    // No se reintenta solo: no se sabe si el correo alcanzó a salir.
    await this.prisma.pilotInvitation.updateMany({
      where: { status: "sending", attemptedAt: { lt: new Date(now.getTime() - STALE_SENDING_MS) } },
      data: { status: "failed", tokenHash: null, queuedAt: null },
    });
    if (!queueWindowOpen(now.getTime())) return result;

    // A lo más el cupo de un día por pasada.
    for (let i = 0; i < DAILY_CAP; i += 1) {
      const next = await this.takeFromQueue(now);
      if (!next) break;
      if (result.sent + result.failed > 0) await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
      if ((await this.deliver(next, now)) === "sent") result.sent += 1;
      else result.failed += 1;
    }
    return result;
  }

  private takeFromQueue(now: Date): Promise<PilotInvitation | null> {
    return this.locked(async (tx) => {
      for (;;) {
        if ((await this.usedToday(tx, now)) >= DAILY_CAP) return null;
        const row = await tx.pilotInvitation.findFirst({ where: { status: "queued" }, orderBy: [{ queuedAt: "asc" }, { id: "asc" }] });
        if (!row) return null;
        // Si mientras esperaba ya creó su cuenta, no se le escribe.
        if (await tx.user.findUnique({ where: { email: row.email }, select: { id: true } })) {
          if (row.sentAt) await tx.pilotInvitation.update({ where: { id: row.id }, data: { status: "sent", queuedAt: null } });
          else await tx.pilotInvitation.delete({ where: { id: row.id } });
          continue;
        }
        return tx.pilotInvitation.update({ where: { id: row.id }, data: { status: "sending", attemptedAt: now, queuedAt: null } });
      }
    });
  }

  // El enlace se crea al enviar y solo se guarda su hash. Se guarda antes de
  // mandar el correo para que sirva apenas llegue.
  private async deliver(row: PilotInvitation, now: Date): Promise<"sent" | "failed"> {
    const token = generateRawToken();
    await this.prisma.pilotInvitation.update({ where: { id: row.id }, data: { tokenHash: hashToken(token), expiresAt: expiryFrom(now) } });
    try {
      await this.mail.sendPilotInvitationEmail(row.email, token);
    } catch {
      await this.prisma.pilotInvitation.updateMany({ where: { id: row.id, status: "sending" }, data: { status: "failed", tokenHash: null, expiresAt: row.expiresAt } });
      return "failed";
    }
    // `updateMany`: si la persona alcanzó a registrarse, no se pisa «usada».
    await this.prisma.pilotInvitation.updateMany({ where: { id: row.id, status: "sending" }, data: { status: "sent", sentAt: now } });
    return "sent";
  }

  // La invitación que abre un enlace; error igual si venció, se usó o no existe.
  async findUsable(token: string, now = new Date()): Promise<PilotInvitation> {
    const row = await this.prisma.pilotInvitation.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!row || (row.status !== "sent" && row.status !== "sending") || !row.expiresAt || row.expiresAt <= now) {
      throw new GoneException(INVITATION_GONE_MESSAGE);
    }
    return row;
  }

  // Dentro de la transacción que crea la cuenta: de dos intentos a la vez gana uno.
  async claim(tx: Prisma.TransactionClient, invitation: PilotInvitation, userId: string, now = new Date()): Promise<void> {
    const claimed = await tx.pilotInvitation.updateMany({
      where: { id: invitation.id, tokenHash: invitation.tokenHash, status: { in: ["sent", "sending"] }, expiresAt: { gt: now } },
      data: { status: "used", usedAt: now, usedByUserId: userId, tokenHash: null, sentAt: invitation.sentAt ?? now },
    });
    if (claimed.count !== 1) throw new GoneException(INVITATION_GONE_MESSAGE);
  }

  // Cupo usado del día de Chile: las enviadas hoy y las que se están enviando. Un error no cuenta.
  private usedToday(db: Prisma.TransactionClient, now: Date): Promise<number> {
    const today = chileDayRange(chileDate(now.getTime()));
    return db.pilotInvitation.count({ where: { OR: [{ sentAt: today, status: { not: "sending" } }, { status: "sending", attemptedAt: today }] } });
  }

  private locked<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
      return work(tx);
    });
  }
}

function byQueueOrder(a: PilotInvitation, b: PilotInvitation): number {
  return (a.queuedAt?.getTime() ?? 0) - (b.queuedAt?.getTime() ?? 0) || a.id.localeCompare(b.id);
}

// El mensaje de un error de la base puede traer datos: solo se registra su tipo.
function errorName(err: unknown): string {
  return err instanceof Error ? err.name : "error desconocido";
}
