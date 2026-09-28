// Fechas en hora de Chile para el resumen diario. Chile cambia de horario
// (UTC-3 / UTC-4), así que los límites de "un día" se calculan con la zona
// horaria y no con un desfase fijo.

export const CHILE_TZ = "America/Santiago";
const DAY_MS = 24 * 60 * 60 * 1000;

// Diferencia entre la hora de Chile y UTC en el instante `t` (en ms).
function offsetMs(t: number): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: CHILE_TZ,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(new Date(t))
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(t / 1000) * 1000;
}

// Fecha de Chile (AAAA-MM-DD) en el instante `t`.
export function chileDate(t: number = Date.now()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CHILE_TZ }).format(new Date(t));
}

export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// Primer instante del día `day` en Chile. Se prueban los desfases de antes y
// después del día (por si cambia el horario) y se queda con el primer
// instante que de verdad cae en `day`: cuando el reloj salta de 00:00 a 01:00,
// la medianoche no existe y el día empieza a la 01:00.
function chileMidnight(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  const naive = Date.UTC(y, m - 1, d);
  const candidates = [naive - offsetMs(naive - DAY_MS), naive - offsetMs(naive + DAY_MS)]
    .filter((t) => chileDate(t) === day)
    .sort((a, b) => a - b);
  return new Date(candidates[0] ?? naive - offsetMs(naive));
}

// [inicio, fin) del día `day` en Chile, como instantes UTC para las consultas.
export function chileDayRange(day: string): { gte: Date; lt: Date } {
  return { gte: chileMidnight(day), lt: chileMidnight(addDays(day, 1)) };
}

// "sábado 27 de septiembre"
export function chileDayLabel(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d))
    .toLocaleDateString("es-CL", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" })
    .replace(",", "");
}

export function isValidDay(day: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && addDays(day, 0) === day;
}
