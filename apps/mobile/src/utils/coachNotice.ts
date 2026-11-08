import { notificationCopy, type AppNotification, type NotificationTarget } from '@cycles/shared';

// Aviso «Tu coach agregó una rutina» de Hoy (CYC-256): sale de los avisos que ya existen
// (`/notifications`), sin API nueva. Solo cuentan los NO leídos de tipo `session_added`
// y `plan_assigned`; abrirlo los marca como leídos y la campana pierde su punto.
export interface CoachNotice {
  title: string;
  detail: string;
  /** Avisos que cubre, para marcarlos como leídos al abrir. */
  ids: string[];
  /** Adónde lleva: la sesión si es una sola; si no, el calendario. */
  target: NotificationTarget;
}

const RELEVANT = new Set(['session_added', 'plan_assigned']);

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : '');

export function coachNotice(notifications: AppNotification[]): CoachNotice | null {
  const unread = notifications.filter(n => !n.read && RELEVANT.has(n.type));
  if (unread.length === 0) {
    return null;
  }
  const onlyPlans = unread.every(n => n.type === 'plan_assigned');
  // Un aviso de «sesión nueva» agrupa varios ajustes en `count`: cada uno es una rutina.
  const total = unread.reduce((sum, n) => sum + (n.type === 'session_added' ? Math.max(1, n.count) : 1), 0);
  const title = onlyPlans
    ? total === 1
      ? 'Tu coach te asignó un ciclo'
      : `Tu coach te asignó ${total} ciclos`
    : total === 1
      ? 'Tu coach agregó una rutina'
      : `Tu coach agregó ${total} rutinas`;

  let detail = 'Revisa lo nuevo en tu calendario.';
  let target: NotificationTarget = { kind: 'plan', planId: unread[0].planId ?? '' };
  if (unread.length === 1) {
    const [only] = unread;
    const routine = text(only.payload.routineName);
    const plan = text(only.payload.planName);
    if (only.type === 'session_added' && only.count <= 1 && routine) {
      detail = routine;
    } else if (only.type === 'plan_assigned' && plan) {
      detail = plan;
    }
    target = notificationCopy(only).target;
  }
  return { title, detail, ids: unread.map(n => n.id), target };
}
