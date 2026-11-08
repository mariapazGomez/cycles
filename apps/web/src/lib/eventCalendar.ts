import type { AthleteEventOccurrence } from '@cycles/shared';

// Lógica de calendario por fechas reales para las actividades paralelas (CYC-253). COPIA de
// apps/mobile/src/utils/eventCalendar.ts (CYC-252, CYC-254): si cambia la regla en la app, cámbiala aquí.
// Todo en «AAAA-MM-DD» (día local del atleta) y aritmética en UTC, sin zona horaria.
const DAY_MS = 86400000;

const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const toMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

// Letra de cada día en el encabezado del mes (como en el diseño: L M X J V S D).
export const WEEKDAY_LETTER = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;

export const WEEKDAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;

export const addDays = (iso: string, days: number) => toIso(toMs(iso) + days * DAY_MS);

// 0 = lunes … 6 = domingo.
export const weekdayOf = (iso: string) => (new Date(toMs(iso)).getUTCDay() + 6) % 7;

// Lunes de la semana que contiene el día.
export const startOfWeek = (iso: string) => addDays(iso, -weekdayOf(iso));

export interface CalendarDay {
  iso: string;
  day: number;
  /** 0 = lunes … 6 = domingo. */
  weekday: number;
  /** En la vista de mes: ¿pertenece al mes mostrado? (los días de relleno, no). */
  inMonth: boolean;
}

const dayOf = (iso: string, inMonth = true): CalendarDay => ({
  iso,
  day: new Date(toMs(iso)).getUTCDate(),
  weekday: weekdayOf(iso),
  inMonth,
});

// Los 7 días de la semana calendario (lunes a domingo) que contiene el día.
export function calendarWeek(iso: string): CalendarDay[] {
  const first = startOfWeek(iso);
  return Array.from({ length: 7 }, (_, i) => dayOf(addDays(first, i)));
}

export const shiftWeek = (iso: string, weeks: number) => addDays(iso, weeks * 7);

// Mes de la vista: «AAAA-MM» y filas de semanas completas (lunes a domingo), con los
// días de relleno del mes anterior y siguiente marcados `inMonth: false`.
export function monthGrid(year: number, month: number): CalendarDay[][] {
  const first = `${year}-${String(month).padStart(2, '0')}-01`;
  const last = toIso(Date.UTC(year, month, 0));
  const start = startOfWeek(first);
  const end = addDays(last, 6 - weekdayOf(last));
  const rows: CalendarDay[][] = [];
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 7)) {
    rows.push(
      Array.from({ length: 7 }, (_, i) => {
        const iso = addDays(cursor, i);
        return dayOf(iso, iso >= first && iso <= last);
      }),
    );
  }
  return rows;
}

// Rango a pedir a la API para pintar el mes completo (incluye los días de relleno).
export function monthRange(year: number, month: number): { from: string; to: string } {
  const rows = monthGrid(year, month);
  return { from: rows[0][0].iso, to: rows[rows.length - 1][6].iso };
}

export function shiftMonth(year: number, month: number, months: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + months;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

const minutesOf = (time: string | null) => (time ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) : -1);

// Orden dentro de un día: «todo el día» primero, luego por hora; sin hora al final de las que tienen.
export function compareEvents(a: AthleteEventOccurrence, b: AthleteEventOccurrence): number {
  if (a.allDay !== b.allDay) {
    return a.allDay ? -1 : 1;
  }
  const byTime = minutesOf(a.startTime) - minutesOf(b.startTime);
  return byTime || a.title.localeCompare(b.title, 'es');
}

// Agrupa las ocurrencias por día, ordenadas.
export function groupByDay(events: AthleteEventOccurrence[]): Record<string, AthleteEventOccurrence[]> {
  const groups: Record<string, AthleteEventOccurrence[]> = {};
  for (const event of events) {
    (groups[event.date] ??= []).push(event);
  }
  for (const day of Object.keys(groups)) {
    groups[day].sort(compareEvents);
  }
  return groups;
}

// Para una celda de mes con poco espacio: las primeras `max` y cuántas más hay («+N»).
export function visibleWithOverflow<T>(items: T[], max: number): { shown: T[]; extra: number } {
  const limit = Math.max(0, max);
  return { shown: items.slice(0, limit), extra: Math.max(0, items.length - limit) };
}

// «Hoy también: voleibol, 19:00» (Hoy) o «voleibol y 1 más».
export function todaySummary(events: AthleteEventOccurrence[]): string {
  if (events.length === 0) {
    return '';
  }
  const [first] = [...events].sort(compareEvents);
  const name = first.title.toLowerCase();
  if (events.length > 1) {
    return `Hoy también: ${name} y ${events.length - 1} más`;
  }
  return `Hoy también: ${name}${first.startTime ? `, ${first.startTime}` : ''}`;
}

// Etiqueta de hora de una tarjeta: «19:00 · 90 min», «Todo el día» o «Sin hora».
export function timeLabel(event: AthleteEventOccurrence): string {
  if (event.allDay) {
    return 'Todo el día';
  }
  if (!event.startTime) {
    return event.durationMin ? `${event.durationMin} min` : 'Sin hora';
  }
  return event.durationMin ? `${event.startTime} · ${event.durationMin} min` : event.startTime;
}

export const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const;

const WEEKDAY_LONG = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'] as const;

// «Noviembre 2026».
export function monthTitle(year: number, month: number): string {
  const name = MONTH_NAMES[month - 1];
  return `${name[0].toUpperCase()}${name.slice(1)} ${year}`;
}

// «viernes 13 de noviembre» (para el detalle del día y los nombres accesibles).
export function longDay(iso: string): string {
  const day = Number(iso.slice(8, 10));
  return `${WEEKDAY_LONG[weekdayOf(iso)]} ${day} de ${MONTH_NAMES[Number(iso.slice(5, 7)) - 1]}`;
}

// Año y mes («AAAA-MM») de un día.
export const monthOf = (iso: string) => ({ year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) });

export interface MonthCell {
  day: CalendarDay;
  /** Perlas a dibujar (máximo 2 en total con el «+N»). */
  shown: AthleteEventOccurrence[];
  extra: number;
}

// Una celda del mes: con 2 actividades o menos, ambas perlas; con más, una perla y «+N»
// (diseño CYC-254). Con letra grande (`compact`), una sola perla y «+N».
export function monthCell(day: CalendarDay, events: AthleteEventOccurrence[], compact = false): MonthCell {
  const limit = compact ? 1 : 2;
  const keep = events.length > limit ? Math.max(1, limit - 1) : events.length;
  const { shown, extra } = visibleWithOverflow(events, keep);
  return { day, shown, extra };
}

// ── Para la web del coach (CYC-253) ─────────────────────────────────────────────────────────────

export const INTENSITY_LABEL = { low: "suave", medium: "media", high: "alta" } as const;

const DAY_SHORT_LOWER = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"] as const;

// «5 nov», «14 dic.»: día corto con el mes abreviado.
export function shortDate(iso: string): string {
  const month = MONTH_NAMES[Number(iso.slice(5, 7)) - 1].slice(0, 3);
  return `${Number(iso.slice(8, 10))} ${month}`;
}

// «Lun y mar», «Lun, mié y vie»: los días de una repetición.
export function daysLabel(days: number[]): string {
  const names = [...days].sort((a, b) => a - b).map((d) => DAY_SHORT_LOWER[d]);
  const text = names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// «Lun y mar, 19:00, hasta el 20 dic. Intensidad alta.» o «Mar 10 nov, 7:30. Intensidad suave.».
export function seriesLabel(event: AthleteEventOccurrence): string {
  const when = event.allDay ? "todo el día" : event.startTime;
  const rule = event.repeat
    ? `${daysLabel(event.repeat.days)}${when ? `, ${when}` : ""}${event.repeat.until ? `, hasta el ${shortDate(event.repeat.until)}` : ", sin fecha final"}`
    : `${DAY_SHORT_LOWER[weekdayOf(event.date)].replace(/^./, (c) => c.toUpperCase())} ${shortDate(event.date)}${when ? `, ${when}` : ""}`;
  return `${rule}.${event.intensity ? ` Intensidad ${INTENSITY_LABEL[event.intensity]}.` : ""}`;
}

// Las series que se ven en un rango: una por `seriesId`, con su primera ocurrencia, ordenadas por esa fecha.
export function seriesIn(events: AthleteEventOccurrence[]): AthleteEventOccurrence[] {
  const first = new Map<string, AthleteEventOccurrence>();
  for (const e of [...events].sort((a, b) => a.date.localeCompare(b.date))) {
    if (!first.has(e.seriesId)) first.set(e.seriesId, e);
  }
  return [...first.values()];
}
