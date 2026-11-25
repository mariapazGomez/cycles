// Reglas de fechas de un ciclo creado por calendario (CYC-314). Funciones puras.
import { startOfUtcDay } from "../common/training";
import { earliestAllowedDay, weekOfDate } from "../sessions/slots";

export const CYCLE_DATE_MESSAGES = {
  beforeToday: "El ciclo no puede empezar antes de hoy.",
  badToday: "La fecha de hoy no es válida.",
  endNotAfterStart: "La fecha de fin debe ser posterior a la fecha de inicio.",
  sessionsOutside: "Hay sesiones fuera de esas fechas: quítalas o muévelas antes de cambiar el ciclo.",
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
