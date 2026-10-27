// Calendario de un ciclo: en qué día de su semana cae cada sesión
// (docs/diseno/ciclo-en-calendario). Funciones puras, sin red. Todo en días
// "AAAA-MM-DD" leídos como UTC, igual que se guardan las fechas del ciclo.
import type { TrainingSession } from "@cycles/shared";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const WEEKDAYS_LONG = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Días de entrenamiento por defecto según cuántas sesiones tiene la semana,
// contados desde el primer día de la semana del ciclo (0 a 6). Se usan solo
// cuando la sesión todavía no tiene un día elegido.
const DEFAULT_OFFSETS: Record<number, number[]> = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 3, 4],
  6: [0, 1, 2, 3, 4, 5],
};

export function utcDay(iso: string): number {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function isoOfDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return isoOfDay(utcDay(iso) + days * DAY_MS);
}

export function defaultOffsets(slots: number): number[] {
  return DEFAULT_OFFSETS[slots] ?? Array.from({ length: slots }, (_, i) => Math.min(i, 6));
}

// Primer día de la semana `week` (1 en adelante) del ciclo.
export function weekStartIso(cycleStart: string, week: number): string {
  return addDays(cycleStart, (week - 1) * 7);
}

// Posición (0 a 6) de la sesión dentro de su semana: el día que se eligió, si
// cae en esa semana; si no, el día por defecto de su lugar.
export function sessionOffset(
  cycleStart: string,
  week: number,
  slot: number,
  slots: number,
  scheduledDate?: string | null,
): number {
  if (scheduledDate) {
    const diff = Math.round((utcDay(scheduledDate) - utcDay(weekStartIso(cycleStart, week))) / DAY_MS);
    if (diff >= 0 && diff <= 6) return diff;
  }
  return defaultOffsets(slots)[slot - 1] ?? Math.min(slot - 1, 6);
}

export function sessionDayIso(
  cycleStart: string,
  session: Pick<TrainingSession, "weekNumber" | "slotNumber" | "scheduledDate">,
  slots: number,
): string {
  const offset = sessionOffset(cycleStart, session.weekNumber, session.slotNumber, slots, session.scheduledDate);
  return addDays(weekStartIso(cycleStart, session.weekNumber), offset);
}

// Encabezados de las siete columnas: la semana del ciclo empieza el día en que
// empieza el ciclo (casi siempre un lunes).
export function columnLabels(cycleStart: string): string[] {
  const first = new Date(utcDay(cycleStart)).getUTCDay();
  return Array.from({ length: 7 }, (_, k) => WEEKDAYS_SHORT[(first + k) % 7]);
}

export function dayOfMonth(iso: string): number {
  return new Date(utcDay(iso)).getUTCDate();
}

export function shortDate(iso: string): string {
  const date = new Date(utcDay(iso));
  return `${date.getUTCDate()} ${MONTHS_SHORT[date.getUTCMonth()]}`;
}

export function weekdayName(iso: string): string {
  return WEEKDAYS_LONG[new Date(utcDay(iso)).getUTCDay()];
}

export function weekdayShort(iso: string): string {
  return WEEKDAYS_SHORT[new Date(utcDay(iso)).getUTCDay()];
}

// "19–25 oct", o "28 oct – 3 nov" si la semana cruza de mes.
export function weekRangeLabel(firstDay: string): string {
  const last = addDays(firstDay, 6);
  const a = new Date(utcDay(firstDay));
  const b = new Date(utcDay(last));
  if (a.getUTCMonth() === b.getUTCMonth()) {
    return `${a.getUTCDate()}–${b.getUTCDate()} ${MONTHS_SHORT[b.getUTCMonth()]}`;
  }
  return `${shortDate(firstDay)} – ${shortDate(last)}`;
}

// Lunes de la semana calendario que contiene `iso`.
export function mondayOf(iso: string): string {
  const day = new Date(utcDay(iso)).getUTCDay();
  return addDays(iso, -((day + 6) % 7));
}
