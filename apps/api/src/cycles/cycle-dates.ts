// Reglas de fechas de un ciclo creado por calendario (CYC-314). Funciones puras.
import { startOfUtcDay } from "../common/training";
import { earliestAllowedDay, weekOfDate } from "../sessions/slots";

export const CYCLE_DATE_MESSAGES = {
  beforeToday: "El ciclo no puede empezar antes de hoy.",
  badToday: "La fecha de hoy no es válida.",
  endNotAfterStart: "La fecha de fin debe ser posterior a la fecha de inicio.",
} as const;

// Un ciclo no empieza antes de hoy, con el día local del coach (`today`). El servidor no conoce su
// zona horaria: acepta un `today` a un día o menos del día UTC; sin él (web antigua) tolera un día
// hacia atrás. Es la misma regla de las sesiones «solo desde hoy». Devuelve el mensaje de error o null.
export function startDateError(startDate: Date, today: string | undefined, now: Date = new Date()): string | null {
  const earliest = earliestAllowedDay(now, today);
  if (!earliest) return CYCLE_DATE_MESSAGES.badToday;
  return startOfUtcDay(startDate) < earliest ? CYCLE_DATE_MESSAGES.beforeToday : null;
}

// No hay ciclos de un solo día: el último día debe ser posterior al primero.
export function isValidRange(startDate: Date, endDate: Date): boolean {
  return startOfUtcDay(endDate) > startOfUtcDay(startDate);
}

// Semanas del ciclo en bloques de 7 días desde el inicio, con el último día incluido.
export function weeksOfCycle(startDate: Date, endDate: Date): number {
  return Math.max(1, weekOfDate(startDate, endDate));
}

export interface PlacedSession {
  id: string;
  weekNumber: number;
  slotNumber: number;
  scheduledDate: Date | null;
  deletedAt: Date | null;
}

export interface OutsideCheck {
  startDate: Date;
  endDate: Date;
}

// Sesiones vigentes que quedarían fuera del nuevo rango: con fecha, antes del inicio o después del
// fin; sin fecha, en una semana que el ciclo ya no tiene. Ninguna se pierde ni se oculta.
export function sessionsOutside(sessions: PlacedSession[], range: OutsideCheck): PlacedSession[] {
  const first = startOfUtcDay(range.startDate);
  const last = startOfUtcDay(range.endDate);
  const weeks = weeksOfCycle(range.startDate, range.endDate);
  return sessions.filter((s) => {
    if (s.deletedAt) return false;
    if (s.scheduledDate) {
      const day = startOfUtcDay(s.scheduledDate);
      return day < first || day > last;
    }
    return s.weekNumber > weeks;
  });
}

// Al mover el inicio, la semana de cada sesión con fecha cambia (la semana 1 empieza el día de
// inicio). Devuelve la semana y el espacio nuevos de TODAS las sesiones (también las borradas, que
// siguen ocupando su espacio en el índice único). Las sin fecha conservan su semana.
export function renumberForStart(sessions: PlacedSession[], startDate: Date): Map<string, { weekNumber: number; slotNumber: number }> {
  const placed = sessions.map((s) => ({
    s,
    week: s.scheduledDate ? Math.max(1, weekOfDate(startDate, s.scheduledDate)) : s.weekNumber,
  }));
  placed.sort(
    (a, b) =>
      a.week - b.week ||
      Number(!!a.s.deletedAt) - Number(!!b.s.deletedAt) ||
      (a.s.scheduledDate?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.s.scheduledDate?.getTime() ?? Number.MAX_SAFE_INTEGER) ||
      a.s.weekNumber - b.s.weekNumber ||
      a.s.slotNumber - b.s.slotNumber,
  );
  const result = new Map<string, { weekNumber: number; slotNumber: number }>();
  let week = 0;
  let slot = 0;
  for (const p of placed) {
    slot = p.week === week ? slot + 1 : 1;
    week = p.week;
    result.set(p.s.id, { weekNumber: week, slotNumber: slot });
  }
  return result;
}

const SHORT_MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const shortDay = (d: Date) => `${d.getUTCDate()} ${SHORT_MONTHS[d.getUTCMonth()]}`;

// Lo que se le dice al coach cuando el cambio dejaría sesiones fuera: cuántas y en qué fechas. Las
// fechas van sin repetir y, si son muchas, se muestran las primeras.
export function outsideError(outside: { scheduledDate: Date | null }[], shown = 5) {
  const dates = [...new Set(outside.filter((s) => s.scheduledDate).map((s) => startOfUtcDay(s.scheduledDate!).toISOString().slice(0, 10)))].sort();
  const listed = dates.slice(0, shown).map((d) => shortDay(new Date(`${d}T00:00:00.000Z`)));
  const more = dates.length > shown ? ` y ${dates.length - shown} fechas más` : "";
  const when = listed.length > 0 ? ` (${listed.join(", ")}${more})` : "";
  const n = outside.length;
  return {
    statusCode: 409,
    message: `No puedes cambiar las fechas: ${n === 1 ? "queda 1 sesión" : `quedan ${n} sesiones`} fuera${when}. Muévelas o quítalas primero.`,
    outside: { count: n, dates },
  };
}

