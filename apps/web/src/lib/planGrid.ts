// Lógica de la grilla del plan: semanas, avance y qué celdas siguen vacías.
// Funciones puras, sin red.
import type { TrainingSession } from "@cycles/shared";

export function totalWeeks(startDate: string, endDate: string): number {
  const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
  return Math.max(1, Math.ceil(ms / (7 * 24 * 60 * 60 * 1000)));
}

export type WeekState = "past" | "current" | "future";

// `currentWeek` es 0 si el plan aún no empieza y mayor que el total si ya terminó.
export function weekState(week: number, currentWeek: number): WeekState {
  if (week < currentWeek) return "past";
  if (week === currentWeek) return "current";
  return "future";
}

export function cellKey(week: number, slot: number): string {
  return `${week}-${slot}`;
}

export interface PlanStats {
  assigned: number;
  completed: number;
  weekAssigned: number;
  weekCompleted: number;
}

export function planStats(sessions: Pick<TrainingSession, "weekNumber" | "status">[], currentWeek: number): PlanStats {
  let assigned = 0;
  let completed = 0;
  let weekAssigned = 0;
  let weekCompleted = 0;
  for (const s of sessions) {
    assigned += 1;
    if (s.status === "completed") completed += 1;
    if (s.weekNumber === currentWeek) {
      weekAssigned += 1;
      if (s.status === "completed") weekCompleted += 1;
    }
  }
  return { assigned, completed, weekAssigned, weekCompleted };
}

export type HeroKind = "empty" | "upcoming" | "running" | "ended";

export function heroKind(stats: PlanStats, currentWeek: number, weeks: number): HeroKind {
  if (stats.assigned === 0) return "empty";
  if (currentWeek < 1) return "upcoming";
  if (currentWeek > weeks) return "ended";
  return "running";
}

// Semanas, desde `fromWeek`, en las que esa sesión sigue sin rutina. Incluye
// la propia celda si está vacía. Sirve para "Repetir en las semanas vacías".
export function emptyWeeksFrom(taken: Set<string>, fromWeek: number, slot: number, weeks: number): number[] {
  const result: number[] = [];
  for (let week = fromWeek; week <= weeks; week++) {
    if (!taken.has(cellKey(week, slot))) result.push(week);
  }
  return result;
}
