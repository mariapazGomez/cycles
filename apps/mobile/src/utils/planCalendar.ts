import type { TrainingCycle, TrainingSession } from '@cycles/shared';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// Semana del plan (1-based) en la que cae `now`; 0 antes del inicio. Misma
// regla que el servidor (planWeekAt en apps/api/src/common/training.ts):
// las semanas son bloques de 7 días contados desde la fecha de inicio.
export function planWeekAt(startDate: string, now: Date): number {
  const elapsed = now.getTime() - Date.parse(startDate);
  if (elapsed < 0) {
    return 0;
  }
  return Math.floor(elapsed / WEEK_MS) + 1;
}

export function totalWeeks(cycle: TrainingCycle, sessions: TrainingSession[]): number {
  const fromDates = Math.ceil((Date.parse(cycle.endDate) - Date.parse(cycle.startDate)) / WEEK_MS);
  const fromSessions = sessions.reduce((max, s) => Math.max(max, s.weekNumber), 0);
  return Math.max(fromDates, fromSessions, 1);
}

// Rango de fechas de una semana del plan, ej. "9 al 15 de octubre". Se usan
// getters UTC porque las fechas del plan se guardan a medianoche UTC; con la
// hora local el día se correría hacia atrás en husos al oeste de UTC.
export function formatWeekRange(startDate: string, week: number): string {
  const from = new Date(Date.parse(startDate) + (week - 1) * WEEK_MS);
  const to = new Date(from.getTime() + 6 * DAY_MS);
  const fromDay = from.getUTCDate();
  const toDay = to.getUTCDate();
  const toMonth = MONTHS[to.getUTCMonth()];
  if (from.getUTCMonth() === to.getUTCMonth()) {
    return `${fromDay} al ${toDay} de ${toMonth}`;
  }
  return `${fromDay} de ${MONTHS[from.getUTCMonth()]} al ${toDay} de ${toMonth}`;
}

export type SessionState = 'done' | 'skipped' | 'next' | 'late' | 'pending';

// Estado visual de una sesión. `next` es la primera pendiente del plan (la
// misma que la app muestra en Inicio); `late` es una pendiente de una semana
// ya pasada.
export function sessionState(
  session: TrainingSession,
  nextPendingId: string | undefined,
  currentWeek: number,
): SessionState {
  if (session.status === 'completed') {
    return 'done';
  }
  if (session.status === 'skipped') {
    return 'skipped';
  }
  if (session.id === nextPendingId) {
    return 'next';
  }
  if (session.weekNumber < currentWeek) {
    return 'late';
  }
  return 'pending';
}

export function firstPending(sessions: TrainingSession[]): TrainingSession | undefined {
  return sessions
    .filter(s => s.status === 'pending')
    .sort((a, b) => a.weekNumber - b.weekNumber || a.slotNumber - b.slotNumber)[0];
}

export function weekProgress(sessions: TrainingSession[], week: number) {
  const inWeek = sessions.filter(s => s.weekNumber === week);
  return { done: inWeek.filter(s => s.status !== 'pending').length, total: inWeek.length };
}
