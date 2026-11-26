import type { TrainingCycle } from "@cycles/shared";
import { utcDay } from "./weekCalendar";

type Range = Pick<TrainingCycle, "startDate" | "endDate" | "status">;

function bounds(cycle: Range): { start: string; end: string } {
  return { start: cycle.startDate.slice(0, 10), end: cycle.endDate.slice(0, 10) };
}

// Días entre `today` y el ciclo: 0 si hoy cae dentro, positivo si queda fuera.
function distance(cycle: Range, today: string): number {
  const { start, end } = bounds(cycle);
  if (today < start) return utcDay(start) - utcDay(today);
  if (today > end) return utcDay(today) - utcDay(end);
  return 0;
}

// El ciclo en curso es el más importante de la ficha. Es el activo cuyas fechas
// incluyen hoy; si no hay, el activo más cercano a hoy; si tampoco, el más
// reciente. Con dos activos que incluyen hoy gana el que empezó después.
export function currentCycle<T extends Range>(cycles: T[], today: string): T | null {
  const active = cycles.filter((c) => c.status === "active");
  const pool = active.length > 0 ? active : cycles;
  let best: T | null = null;
  for (const cycle of pool) {
    if (!best) {
      best = cycle;
      continue;
    }
    const gap = distance(cycle, today) - distance(best, today);
    if (gap < 0 || (gap === 0 && bounds(cycle).start > bounds(best).start)) best = cycle;
  }
  return best;
}

export type SectionKind = "current" | "future" | "past";

// Con dos ciclos a la vez (CYC-314), todo activo cuyas fechas incluyen hoy está «En curso», no solo
// el principal de la ficha.
export function sectionKind(cycle: Range, current: Range | null, today: string): SectionKind {
  if (cycle === current || (cycle.status === "active" && distance(cycle, today) === 0)) return "current";
  return cycle.status === "active" && bounds(cycle).start > today ? "future" : "past";
}

// Orden de la ficha: el ciclo principal arriba, seguido de los otros en curso; después los que vienen, del más
// próximo al más lejano; al final los pasados, del más reciente al más antiguo.
export function orderSections<T extends Range>(cycles: T[], today: string): { cycles: T[]; current: T | null } {
  const current = currentCycle(cycles, today);
  const rest = cycles.filter((c) => c !== current);
  const alsoCurrent = rest
    .filter((c) => sectionKind(c, current, today) === "current")
    .sort((a, b) => bounds(b).start.localeCompare(bounds(a).start));
  const future = rest
    .filter((c) => sectionKind(c, current, today) === "future")
    .sort((a, b) => bounds(a).start.localeCompare(bounds(b).start));
  const past = rest
    .filter((c) => sectionKind(c, current, today) === "past")
    .sort((a, b) => bounds(b).start.localeCompare(bounds(a).start));
  return { cycles: [...(current ? [current] : []), ...alsoCurrent, ...future, ...past], current };
}
