import { BadRequestException } from "@nestjs/common";
import { EVENT_RANGE_MAX_DAYS } from "@cycles/shared";
import type { EventFields } from "./event-input";
import { isDay } from "./event-input";

// Repetición de las actividades paralelas (CYC-251): una regla (días de la semana, hasta una
// fecha o sin fin) y excepciones por día. Se expande al consultar un rango; nunca se guarda
// una fila por semana. Funciones puras, sin base de datos.

const DAY_MS = 86_400_000;
const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

// 0 = lunes … 6 = domingo.
export function weekdayOf(date: string): number {
  return (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
}

export function parseRange(from: unknown, to: unknown): { from: string; to: string } {
  if (!isDay(from) || !isDay(to)) throw new BadRequestException("«from» y «to» deben ser fechas AAAA-MM-DD.");
  if (to < from) throw new BadRequestException("«to» no puede ser anterior a «from».");
  if ((ms(to) - ms(from)) / DAY_MS + 1 > EVENT_RANGE_MAX_DAYS) {
    throw new BadRequestException(`El rango puede abarcar como máximo ${EVENT_RANGE_MAX_DAYS} días.`);
  }
  return { from, to };
}

export interface SeriesRow extends EventFields {
  id: string;
}

export interface ExceptionRow {
  date: string;
  cancelled: boolean;
  overrides: Partial<EventFields> | null;
}

// ¿Esta serie cae en este día? (sin mirar excepciones)
export function occursOn(series: Pick<EventFields, "date" | "repeat">, date: string): boolean {
  if (!series.repeat) return date === series.date;
  if (date < series.date) return false;
  if (series.repeat.until !== null && date > series.repeat.until) return false;
  return series.repeat.days.includes(weekdayOf(date));
}

// Días de la serie dentro del rango (ambos extremos incluidos).
export function datesInRange(series: Pick<EventFields, "date" | "repeat">, from: string, to: string): string[] {
  if (!series.repeat) return series.date >= from && series.date <= to ? [series.date] : [];
  const start = series.date > from ? series.date : from;
  const end = series.repeat.until !== null && series.repeat.until < to ? series.repeat.until : to;
  const out: string[] = [];
  for (let t = ms(start); t <= ms(end); t += DAY_MS) {
    const d = iso(t);
    if (series.repeat.days.includes(weekdayOf(d))) out.push(d);
  }
  return out;
}

export interface Occurrence extends Omit<EventFields, "date"> {
  seriesId: string;
  date: string;
  isException: boolean;
}

// Ocurrencias del rango con la repetición resuelta: los días cancelados no salen y los
// editados «solo ese día» traen sus cambios y `isException: true`. Orden: por fecha, los de
// todo el día primero y luego por hora.
export function expand(series: SeriesRow[], exceptions: Map<string, ExceptionRow[]>, from: string, to: string): Occurrence[] {
  const out: Occurrence[] = [];
  for (const s of series) {
    const byDate = new Map((exceptions.get(s.id) ?? []).map((e) => [e.date, e]));
    for (const date of datesInRange(s, from, to)) {
      const ex = byDate.get(date);
      if (ex?.cancelled) continue;
      const { id, ...base } = s;
      out.push({ ...base, ...(ex?.overrides ?? {}), repeat: s.repeat, date, seriesId: id, isException: Boolean(ex) });
    }
  }
  return out.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      Number(b.allDay) - Number(a.allDay) ||
      (a.startTime ?? "").localeCompare(b.startTime ?? "") ||
      a.title.localeCompare(b.title, "es"),
  );
}
