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

const WEEKDAY_LETTERS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const WEEKDAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

// Día local "AAAA-MM-DD" de una fecha: el "hoy" del atleta según su zona.
export function toLocalDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

// Día asignado de una sesión como "AAAA-MM-DD". Se guarda a medianoche UTC,
// así que el día es el de la parte de fecha del texto, sin pasar por la zona
// horaria local (que lo correría hacia atrás al oeste de UTC).
export function sessionDay(session: TrainingSession): string | null {
  return session.scheduledDate ? session.scheduledDate.slice(0, 10) : null;
}

export interface PlanDay {
  iso: string;
  day: number;
  letter: string;
  name: string;
}

// Los 7 días de una semana del plan (empieza el día de la semana en que
// empieza el plan, no necesariamente el lunes).
export function weekDays(startDate: string, week: number): PlanDay[] {
  const first = Date.parse(startDate) + (week - 1) * WEEK_MS;
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(first + i * DAY_MS);
    return {
      iso: date.toISOString().slice(0, 10),
      day: date.getUTCDate(),
      letter: WEEKDAY_LETTERS[date.getUTCDay()],
      name: WEEKDAY_NAMES[date.getUTCDay()],
    };
  });
}

// ¿El día cae dentro de las fechas del plan? (misma regla que valida la API).
export function isDayInPlan(iso: string, cycle: TrainingCycle): boolean {
  return iso >= cycle.startDate.slice(0, 10) && iso <= cycle.endDate.slice(0, 10);
}

// "viernes 17" a partir de "AAAA-MM-DD".
export function formatDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return `${WEEKDAY_NAMES[date.getUTCDay()]} ${date.getUTCDate()}`;
}
