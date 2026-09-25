// Cálculos de entrenamiento compartidos entre el registro del atleta y el
// seguimiento del coach. Ver docs/prds/features/PRD-EjecucionYSeguimiento.md, §7.3.

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

// Filtro Prisma para quedarse con los registros vigentes de una tabla
// append-only: los que ninguna corrección reemplazó.
export const CURRENT_ONLY = { supersededBy: { is: null } } as const;

// Semana del plan (1-based) en la que cae `now`. Antes del inicio devuelve 0.
export function planWeekAt(startDate: Date, now: Date): number {
  const elapsed = now.getTime() - startDate.getTime();
  if (elapsed < 0) {
    return 0;
  }
  return Math.floor(elapsed / WEEK_MS) + 1;
}

// Fecha de inicio de la semana `weekNumber` del plan.
export function planWeekStart(startDate: Date, weekNumber: number): Date {
  return new Date(startDate.getTime() + (weekNumber - 1) * WEEK_MS);
}

// 1RM estimado (Epley) ajustado por repeticiones en reserva: una serie de
// 5 reps con 2 en reserva cuenta como una de 7 al fallo. Sin RIR, se asume 0.
export function estimateOneRepMax(weight: number, reps: number, rir: number | null): number {
  return weight * (1 + (reps + (rir ?? 0)) / 30);
}

// Redondea a 0,5 kg, el menor salto habitual con discos fraccionados.
export function roundToHalfKg(weight: number): number {
  return Math.round(weight * 2) / 2;
}

// Lunes 00:00 UTC de la semana calendario que contiene `date`.
export function calendarWeekStart(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const daysSinceMonday = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - daysSinceMonday * DAY_MS);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}
