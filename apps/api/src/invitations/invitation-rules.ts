import { addDays, chileDate, CHILE_TZ } from "../activity/chile-time";

// Reglas de las invitaciones del piloto (CYC-295, docs/diseno/invitacion-onboarding).

export const DAILY_CAP = 15;
export const INVITATION_DAYS = 7;
export const KEEP_MONTHS = 12;
// La cola sale sola desde las 10:00 y nunca desde las 20:00 de Chile. El clic de
// una persona del equipo envía a cualquier hora.
export const QUEUE_FROM_HOUR = 10;
export const QUEUE_UNTIL_HOUR = 20;
// Un envío que quedó «enviando» más de esto se da por fallido (el proceso se cortó).
export const STALE_SENDING_MS = 10 * 60 * 1000;
// Cuándo se publicó el aviso del formulario que anuncia la invitación. Sin fecha,
// todavía no se publicó: todos los mensajes son anteriores. Se fija al publicarlo.
export const NEW_CONTACT_NOTICE_SINCE: Date | null = null;

export function chileHour(t: number): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: CHILE_TZ, hourCycle: "h23", hour: "2-digit" }).format(new Date(t)));
}

export function queueWindowOpen(t: number): boolean {
  const hour = chileHour(t);
  return hour >= QUEUE_FROM_HOUR && hour < QUEUE_UNTIL_HOUR;
}

// Desde qué día sale la que está en la posición `index` de la cola (0 = la
// primera), según el cupo que queda hoy. Es una estimación: si un día la cola no
// corre, sale al siguiente.
export function queueDay(index: number, usedToday: number, now: number, cap = DAILY_CAP): string {
  const today = chileDate(now);
  const freeToday = chileHour(now) < QUEUE_UNTIL_HOUR ? Math.max(0, cap - usedToday) : 0;
  if (index < freeToday) return today;
  return addDays(today, 1 + Math.floor((index - freeToday) / cap));
}

export function expiryFrom(sentAt: Date): Date {
  return new Date(sentAt.getTime() + INVITATION_DAYS * 24 * 60 * 60 * 1000);
}

export function purgeBefore(now: Date): Date {
  const limit = new Date(now);
  limit.setMonth(limit.getMonth() - KEEP_MONTHS);
  return limit;
}

export type InvitationState = "not_invited" | "queued" | "sending" | "sent" | "expired" | "failed" | "registered" | "has_account";

// Lo que muestra cada fila de admin. «Sin invitar», «Vencida» y «Ya tenía cuenta» se calculan.
export function invitationState(
  invitation: { status: "queued" | "sending" | "sent" | "failed" | "used"; expiresAt: Date | null } | null,
  hasAccount: boolean,
  now: Date,
): InvitationState {
  if (invitation?.status === "used") return "registered";
  if (hasAccount) return "has_account";
  if (!invitation) return "not_invited";
  if (invitation.status === "sent") return invitation.expiresAt && invitation.expiresAt > now ? "sent" : "expired";
  return invitation.status;
}
