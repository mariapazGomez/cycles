import type { TrainingSession } from "@cycles/shared";

// Ayudas de la vista del ciclo para el atleta (docs/diseno/plan-del-atleta).
// Las semanas son bloques de 7 días contados desde la fecha de inicio, y esa
// fecha se guarda a medianoche UTC: por eso se leen siempre con getters UTC.

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
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
const LETTERS = ["D", "L", "M", "X", "J", "V", "S"];

export interface WeekDay {
  iso: string;
  day: number;
  letter: string;
}

// Los 7 días de una semana del ciclo (empieza el día de la semana en que empieza
// el ciclo, no necesariamente el lunes).
export function weekDays(startDate: string, week: number): WeekDay[] {
  const first = Date.parse(startDate) + (week - 1) * WEEK_MS;
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(first + i * DAY_MS);
    return { iso: date.toISOString().slice(0, 10), day: date.getUTCDate(), letter: LETTERS[date.getUTCDay()] };
  });
}

// "12 al 18 de octubre", o "28 de septiembre al 4 de octubre" si cruza de mes.
export function weekRangeLabel(startDate: string, week: number): string {
  const days = weekDays(startDate, week);
  const from = new Date(`${days[0].iso}T00:00:00Z`);
  const to = new Date(`${days[6].iso}T00:00:00Z`);
  if (from.getUTCMonth() === to.getUTCMonth()) {
    return `${from.getUTCDate()} al ${to.getUTCDate()} de ${MONTHS[to.getUTCMonth()]}`;
  }
  return `${from.getUTCDate()} de ${MONTHS[from.getUTCMonth()]} al ${to.getUTCDate()} de ${MONTHS[to.getUTCMonth()]}`;
}

// Una semana está completa cuando tiene sesiones y ninguna sigue pendiente.
export function weekIsComplete(sessions: Pick<TrainingSession, "weekNumber" | "status">[], week: number): boolean {
  const inWeek = sessions.filter((s) => s.weekNumber === week);
  return inWeek.length > 0 && inWeek.every((s) => s.status !== "pending");
}

// La primera sesión pendiente del ciclo, por semana y lugar.
export function firstPending<T extends Pick<TrainingSession, "weekNumber" | "slotNumber" | "status">>(
  sessions: T[],
): T | undefined {
  return sessions
    .filter((s) => s.status === "pending")
    .sort((a, b) => a.weekNumber - b.weekNumber || a.slotNumber - b.slotNumber)[0];
}

// Lo que le toca ahora: la primera pendiente de la semana en curso o de una
// anterior. Si ya hizo todo lo de esta semana, no hay "Te toca".
export function dueNow<T extends Pick<TrainingSession, "weekNumber" | "slotNumber" | "status">>(
  sessions: T[],
  currentWeek: number,
): T | undefined {
  const next = firstPending(sessions);
  return next && next.weekNumber <= currentWeek ? next : undefined;
}

export function weekCount(sessions: Pick<TrainingSession, "weekNumber" | "status">[], week: number) {
  const inWeek = sessions.filter((s) => s.weekNumber === week);
  return { done: inWeek.filter((s) => s.status === "completed").length, total: inWeek.length };
}
