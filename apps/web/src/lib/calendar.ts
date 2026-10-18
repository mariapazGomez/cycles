import type { TrainingCycle, TrainingSession } from "@cycles/shared";

// Calendario del atleta (docs/diseno/plan-del-atleta). Todo en días "AAAA-MM-DD".

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const WEEKDAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export interface CalendarSession {
  id: string;
  cycleId: string;
  planName: string;
  name: string;
  weekNumber: number;
  slotNumber: number;
  status: TrainingSession["status"];
  // Día en que se ve en el calendario; null si no tiene día todavía.
  day: string | null;
}

export interface CalendarCell {
  iso: string;
  day: number;
  inMonth: boolean;
}

// Día local "AAAA-MM-DD": el "hoy" del atleta según su zona.
export function toLocalDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// Una sesión hecha cuenta el día en que se empezó (es lo que de verdad pasó);
// si no hay hora de inicio, el día que se eligió. Una pendiente u omitida usa el
// día elegido, que se guarda a medianoche UTC: se lee la parte de fecha sin
// pasar por la zona horaria local.
export function calendarDay(session: TrainingSession): string | null {
  if (session.status === "completed" && session.startedAt) {
    return toLocalDay(new Date(session.startedAt));
  }
  return session.scheduledDate ? session.scheduledDate.slice(0, 10) : null;
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function monthName(month: number): string {
  return MONTHS[month];
}

// Las semanas del mes, de lunes a domingo, con los días de relleno del mes
// anterior y el siguiente.
export function monthGrid(year: number, month: number): CalendarCell[][] {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const start = Date.UTC(year, month, 1 - offset);
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const weeks = Math.ceil((offset + daysInMonth) / 7);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(start + (w * 7 + d) * 24 * 60 * 60 * 1000);
      return {
        iso: date.toISOString().slice(0, 10),
        day: date.getUTCDate(),
        inMonth: date.getUTCMonth() === month,
      };
    }),
  );
}

// "viernes 16", con la primera letra en mayúscula.
export function dayLabel(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  const text = `${WEEKDAY_NAMES[date.getUTCDay()]} ${date.getUTCDate()}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// "13 de octubre", para las etiquetas de accesibilidad.
export function longDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return `${date.getUTCDate()} de ${MONTHS[date.getUTCMonth()]}`;
}

function planWeekAt(startDate: string, now: Date): number {
  const elapsed = now.getTime() - Date.parse(startDate);
  return elapsed < 0 ? 0 : Math.floor(elapsed / WEEK_MS) + 1;
}

// Semanas seguidas del plan con al menos una sesión hecha, contadas hacia atrás
// desde la actual. Si la semana actual aún no tiene ninguna, no rompe la racha:
// se cuenta desde la anterior. Misma regla que el Resumen de la app
// (apps/mobile/src/utils/muscleSummary.ts).
function weekStreak(sessions: CalendarSession[], currentWeek: number): number {
  const done = new Set(sessions.filter((s) => s.status === "completed").map((s) => s.weekNumber));
  let week = currentWeek;
  if (!done.has(week)) week -= 1;
  let streak = 0;
  while (week >= 1 && done.has(week)) {
    streak += 1;
    week -= 1;
  }
  return streak;
}

// La racha más larga entre los planes del atleta.
export function bestStreak(plans: TrainingCycle[], sessions: CalendarSession[], now: Date): number {
  return plans.reduce((best, plan) => {
    const own = sessions.filter((s) => s.cycleId === plan.id);
    return Math.max(best, weekStreak(own, planWeekAt(plan.startDate, now)));
  }, 0);
}

// La siguiente sesión pendiente: la de la semana y el lugar más tempranos.
export function nextPending(sessions: CalendarSession[]): CalendarSession | undefined {
  return sessions
    .filter((s) => s.status === "pending")
    .sort((a, b) => a.weekNumber - b.weekNumber || a.slotNumber - b.slotNumber)[0];
}
