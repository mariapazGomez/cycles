// Elegir las fechas de un ciclo en un calendario (CYC-314, docs/diseno/ciclo-del-equipo).
// Reglas puras; la API las repite y es quien manda.
import { addDays, MONTH_NAMES, weekdayOf } from "./eventCalendar";

export interface Range {
  start: string | null;
  end: string | null;
}

export const EMPTY_RANGE: Range = { start: null, end: null };

export const BEFORE_TODAY_REASON = "El ciclo no puede empezar antes de hoy.";

// Un toque elige el primer día y otro el último; tocar de nuevo empieza otro rango. No hay ciclos de
// un solo día (repetir el primer día no completa el rango). Los días anteriores a hoy no se eligen.
export function pickDay(range: Range, iso: string, today: string): Range {
  if (!range.start || range.end) return iso < today ? range : { start: iso, end: null };
  if (iso === range.start) return range;
  if (iso < range.start) return iso < today ? range : { start: iso, end: null };
  return { start: range.start, end: iso };
}

// Al editar un ciclo que ya empezó, el inicio se conserva y los toques eligen el último día.
export function pickEnd(range: Range, iso: string): Range {
  if (!range.start || iso <= range.start) return range;
  return { start: range.start, end: iso };
}

// Al asignar una plantilla solo se elige el primer día: el último sale de sus semanas.
export function rangeForWeeks(start: string, weeks: number): Range {
  return { start, end: addDays(start, weeks * 7 - 1) };
}

const DAY_MS = 86_400_000;
export function daysInRange(start: string, end: string): number {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY_MS) + 1;
}

// «4 semanas», «2 semanas y 3 días», «5 días»; el último día cuenta.
export function durationText(start: string, end: string): string {
  const days = daysInRange(start, end);
  const weeks = Math.floor(days / 7);
  const rest = days % 7;
  const w = weeks === 0 ? "" : `${weeks} ${weeks === 1 ? "semana" : "semanas"}`;
  const d = rest === 0 ? "" : `${rest} ${rest === 1 ? "día" : "días"}`;
  return [w, d].filter(Boolean).join(" y ");
}

const WEEKDAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

export function dayName(iso: string, today: string): string {
  const month = MONTH_NAMES[Number(iso.slice(5, 7)) - 1].slice(0, 3).toLowerCase();
  const year = iso.slice(0, 4) === today.slice(0, 4) ? "" : ` ${iso.slice(0, 4)}`;
  return `${WEEKDAYS[weekdayOf(iso)]} ${Number(iso.slice(8, 10))} ${month}${year}`;
}

// El resumen bajo el calendario, que también se anuncia a lectores de pantalla.
export function rangeSummary(range: Range, today: string): string {
  if (!range.start) return "Elige el primer día.";
  if (!range.end) return `Empieza el ${dayName(range.start, today)}. Elige el último día.`;
  return `Del ${dayName(range.start, today)} al ${dayName(range.end, today)}: ${durationText(range.start, range.end)}`;
}

export function fullDayLabel(iso: string): string {
  const month = MONTH_NAMES[Number(iso.slice(5, 7)) - 1].toLowerCase();
  return `${WEEKDAYS[weekdayOf(iso)]} ${Number(iso.slice(8, 10))} de ${month} de ${iso.slice(0, 4)}`;
}

// Días (AAAA-MM-DD) cubiertos por otros ciclos: marcan el calendario, sin bloquear.
export function busyDays(cycles: { startDate: string; endDate: string }[], limit = 800): Set<string> {
  const out = new Set<string>();
  for (const c of cycles) {
    const end = c.endDate.slice(0, 10);
    for (let d = c.startDate.slice(0, 10); d <= end && out.size < limit; d = addDays(d, 1)) out.add(d);
  }
  return out;
}

// Sesiones que quedarían fuera de las nuevas fechas: con fecha, antes del inicio o después del fin;
// sin fecha, en una semana que el ciclo ya no tiene. La misma regla de la API.
export function outsideSessions<T extends { weekNumber: number; scheduledDate?: string | null }>(sessions: T[], start: string, end: string): T[] {
  const weeks = Math.floor((daysInRange(start, end) - 1) / 7) + 1;
  return sessions.filter((s) => {
    const day = s.scheduledDate?.slice(0, 10);
    return day ? day < start || day > end : s.weekNumber > weeks;
  });
}

const shortMonth = (iso: string) => MONTH_NAMES[Number(iso.slice(5, 7)) - 1].slice(0, 3).toLowerCase();

// «lunes 30 nov, miércoles 2 y viernes 4 dic»: el mes va una vez, al final de cada tramo.
export function listDays(isos: string[], shown = 5): string {
  const days = [...new Set(isos)].sort();
  const first = days.slice(0, shown);
  const parts = first.map((iso, i) => {
    const lastOfMonth = i === first.length - 1 || first[i + 1].slice(0, 7) !== iso.slice(0, 7);
    return `${WEEKDAYS[weekdayOf(iso)]} ${Number(iso.slice(8, 10))}${lastOfMonth ? ` ${shortMonth(iso)}` : ""}`;
  });
  if (days.length > shown) return `${parts.join(", ")} y ${days.length - shown} fechas más`;
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}` : (parts[0] ?? "");
}

// El aviso de «Datos del ciclo» cuando las nuevas fechas dejarían sesiones fuera, o null.
export function outsideWarning(
  sessions: { weekNumber: number; scheduledDate?: string | null }[],
  range: Range,
  original: Range,
): string | null {
  if (!range.start || !range.end) return null;
  if (range.start === original.start && range.end === original.end) return null;
  const outside = outsideSessions(sessions, range.start, range.end);
  if (outside.length === 0) return null;
  const shortened = range.start === original.start && range.end < (original.end ?? "");
  const what = shortened ? `acortar el ciclo hasta el ${Number(range.end.slice(8, 10))} ${shortMonth(range.end)}` : "cambiar las fechas";
  const count = outside.length === 1 ? "queda 1 sesión" : `quedan ${outside.length} sesiones`;
  const dated = outside.flatMap((s) => (s.scheduledDate ? [s.scheduledDate.slice(0, 10)] : []));
  const when = dated.length > 0 ? ` (${listDays(dated)})` : "";
  return `No puedes ${what}: ${count} fuera${when}. ${outside.length === 1 ? "Muévela o quítala" : "Muévelas o quítalas"} primero.`;
}
