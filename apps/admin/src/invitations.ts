// Textos y reglas de la pestaña Invitaciones (CYC-295, docs/diseno/invitacion-onboarding/
// admin-invitaciones.md). Lógica sin React.
import type { InvitationRow, InvitationState, InvitationsPage } from "./api";

export type Filter = "pending" | "queue" | "done" | "all";

export const FILTERS: { id: Filter; label: string }[] = [
  { id: "pending", label: "Por enviar" },
  { id: "queue", label: "En cola" },
  { id: "done", label: "Invitadas" },
  { id: "all", label: "Todas" },
];

const IN: Record<Filter, InvitationState[] | null> = {
  pending: ["not_invited", "sending", "failed"],
  queue: ["queued"],
  done: ["sent", "expired", "registered"],
  all: null,
};

// Lo más nuevo va arriba (así llega de la API); en «Por enviar», los errores al final.
export function rowsFor(items: InvitationRow[], filter: Filter): InvitationRow[] {
  const states = IN[filter];
  const rows = states ? items.filter((i) => states.includes(i.state)) : items;
  return filter === "pending" ? [...rows.filter((r) => r.state !== "failed"), ...rows.filter((r) => r.state === "failed")] : rows;
}

export const STATE_TAG: Record<InvitationState, { tone: "muted" | "warn" | "ok" | "err"; label: string }> = {
  not_invited: { tone: "muted", label: "Sin invitar" },
  queued: { tone: "warn", label: "En cola" },
  sending: { tone: "muted", label: "Enviando" },
  sent: { tone: "ok", label: "Enviada" },
  registered: { tone: "ok", label: "Cuenta creada" },
  expired: { tone: "warn", label: "Vencida" },
  failed: { tone: "err", label: "Error de envío" },
  has_account: { tone: "muted", label: "Ya tenía cuenta" },
};

const monthDay = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", timeZone: "America/Santiago" });
const monthDayUtc = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", timeZone: "UTC" });
export const shortDay = (iso: string) => monthDay.format(new Date(iso));
const chileToday = (now: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(now);

// La fecha de la cola la calcula la API como día de Chile (AAAA-MM-DD).
export function queueText(day: string, now = new Date()): string {
  const today = chileToday(now);
  const tomorrow = new Date(Date.parse(`${today}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  const date = monthDayUtc.format(new Date(`${day}T00:00:00Z`));
  if (day <= today) return `Sale hoy, ${date}`;
  return day === tomorrow ? `Sale desde mañana, ${date}` : `Sale desde el ${date}`;
}

export const WAITING_TEXT = "En espera hasta que se active el envío.";

export function stateDetail(row: InvitationRow, enabled: boolean, now = new Date()): string[] {
  switch (row.state) {
    case "queued":
      return [enabled && row.queuedFor ? queueText(row.queuedFor, now) : WAITING_TEXT];
    case "sent":
      return [row.sentAt ? `Enviada el ${shortDay(row.sentAt)}` : "", row.expiresAt ? `Vence el ${shortDay(row.expiresAt)}` : ""].filter(Boolean);
    case "registered":
      return row.usedAt ? [`El ${shortDay(row.usedAt)}`] : [];
    case "expired":
      return row.expiresAt ? [`Venció el ${shortDay(row.expiresAt)}`] : [];
    case "failed":
      return ["No salió el correo."];
    case "not_invited":
      return row.beforeNewNotice ? ["Escribió antes del aviso nuevo."] : [];
    default:
      return [];
  }
}

// ¿El próximo clic irá a la cola? Lo que ya está en cola tiene reservado el cupo.
export function capTaken(page: Pick<InvitationsPage, "sentToday" | "dailyCap" | "items">): boolean {
  return page.sentToday + page.items.filter((i) => i.state === "queued").length >= page.dailyCap;
}

const SEND_LABEL: Partial<Record<InvitationState, string>> = { not_invited: "Enviar invitación", failed: "Reintentar", expired: "Enviar de nuevo" };

// El botón de enviar de una fila; null si no corresponde. Apagado nunca dice «Poner en cola».
export function sendAction(state: InvitationState, enabled: boolean, full: boolean): { label: string; question: string; yes: string } | null {
  const label = SEND_LABEL[state];
  if (!label) return null;
  if (enabled && full) return { label: "Poner en cola", question: "¿Poner en la cola? Sale sola cuando haya cupo.", yes: "Sí, poner en cola" };
  return { label, question: state === "expired" ? "¿Enviar un enlace nuevo? El anterior deja de servir." : "¿Enviar la invitación a este correo?", yes: "Sí, enviar" };
}

export const EMPTY: Record<Filter, [string, string]> = {
  pending: ["No hay solicitudes por enviar", "Cuando alguien escriba desde getcycles.app, aparecerá aquí."],
  queue: ["No hay nada en cola", "La cola se usa cuando ya salieron las {cap} invitaciones del día."],
  done: ["Aún no hay invitaciones", ""],
  all: ["Aún no hay solicitudes", ""],
};
