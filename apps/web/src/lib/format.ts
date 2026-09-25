// Formatos compartidos por las pantallas de ejecución y seguimiento.

const DECIMAL = new Intl.NumberFormat("es", { maximumFractionDigits: 1 });
const INTEGER = new Intl.NumberFormat("es", { maximumFractionDigits: 0 });

export function formatNumber(value: number): string {
  return DECIMAL.format(value);
}

export function formatInteger(value: number): string {
  return INTEGER.format(value);
}

export function formatKg(weight: number | null | undefined): string {
  return weight === null || weight === undefined ? "Peso corporal" : `${formatNumber(weight)} kg`;
}

export function formatPercent(percent: number): string {
  const sign = percent > 0 ? "+" : "−";
  return `${sign}${formatNumber(Math.abs(percent))} %`;
}

// "4 o más" se guarda como 4.
export function formatRir(rir: number | null | undefined): string {
  if (rir === null || rir === undefined) return "—";
  return rir >= 4 ? "4+" : String(rir);
}

// Fechas "YYYY-MM-DD" del backend: se leen a mediodía para que la zona
// horaria no las corra al día anterior.
export function formatShortDate(isoDate: string): string {
  const date = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  return date.toLocaleDateString("es", { day: "numeric", month: "short" }).replace(".", "");
}

export function planWeekOf(startDate: string, now = new Date()): number {
  const elapsed = now.getTime() - new Date(startDate).getTime();
  return elapsed < 0 ? 0 : Math.floor(elapsed / (7 * 24 * 60 * 60 * 1000)) + 1;
}
