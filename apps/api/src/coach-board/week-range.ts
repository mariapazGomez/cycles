// Qué semanas del plan caen en un tramo de fechas, para filtrarlas en la base (CYC-325). La semana
// n de un ciclo empieza el día de inicio del ciclo más (n − 1) semanas. Pura: se prueba sin base.
import { startOfUtcDay } from "../common/training";

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

export interface WeekNumbers {
  gte: number;
  lte: number;
}

// Semanas que EMPIEZAN entre `first` y `last` (incluidos). null = ninguna.
export function weeksStartingBetween(cycleStart: Date, first: Date, last: Date): WeekNumbers | null {
  const start = startOfUtcDay(cycleStart).getTime();
  const gte = Math.max(1, Math.ceil((first.getTime() - start) / WEEK_MS) + 1);
  const lte = Math.floor((last.getTime() - start) / WEEK_MS) + 1;
  return lte >= gte ? { gte, lte } : null;
}

// Semanas con algún día entre `from` y `to`: las que empiezan desde seis días antes de `from`.
export function weeksTouching(cycleStart: Date, from: Date, to: Date): WeekNumbers | null {
  return weeksStartingBetween(cycleStart, new Date(from.getTime() - 6 * DAY_MS), to);
}

// Agrupa los ciclos que comparten semanas, para que la consulta no tenga una condición por ciclo
// (los de un equipo empiezan el mismo día).
export function weekClauses<T extends { id: string }>(cycles: T[], weeksOf: (cycle: T) => WeekNumbers | null): { cycleId: { in: string[] }; weekNumber: WeekNumbers }[] {
  const groups = new Map<string, { cycleId: { in: string[] }; weekNumber: WeekNumbers }>();
  for (const cycle of cycles) {
    const weeks = weeksOf(cycle);
    if (!weeks) continue;
    const key = `${weeks.gte}-${weeks.lte}`;
    const group = groups.get(key) ?? { cycleId: { in: [] }, weekNumber: weeks };
    group.cycleId.in.push(cycle.id);
    groups.set(key, group);
  }
  return [...groups.values()];
}
