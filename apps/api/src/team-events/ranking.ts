// Ranking del equipo (CYC-317): sesiones completadas sobre las asignadas. La cuenta es la de la
// tarjeta del atleta: una sesión es del período por la semana del plan en que le toca, y la semana
// en curso cuenta entera. Funciones puras.
import type { RankingPeriod, TeamRankingRow } from "@cycles/shared";
import { addDays, calendarWeekStart, plannedCalendarWeek, startOfUtcDay } from "../common/training";

export interface RankingCycle {
  status: "active" | "completed" | "archived";
  startDate: Date;
  endDate: Date;
  sessions: { weekNumber: number; status: "pending" | "completed" | "skipped" }[];
}

// «weeks4»: las 4 últimas semanas calendario, con la actual. «cycle»: los ciclos activos que
// incluyen hoy, desde su inicio hasta la semana en curso.
export function countSessions(cycles: RankingCycle[], period: RankingPeriod, now: Date): { assigned: number; completed: number } {
  const thisWeek = calendarWeekStart(now);
  const from = period === "weeks4" ? addDays(thisWeek, -21) : null;
  const today = startOfUtcDay(now);
  const counted =
    period === "cycle" ? cycles.filter((c) => c.status === "active" && startOfUtcDay(c.startDate) <= today && startOfUtcDay(c.endDate) >= today) : cycles;
  let assigned = 0;
  let completed = 0;
  for (const cycle of counted) {
    for (const session of cycle.sessions) {
      const week = plannedCalendarWeek(cycle.startDate, session.weekNumber);
      if (week > thisWeek || (from && week < from)) continue;
      assigned += 1;
      if (session.status === "completed") completed += 1;
    }
  }
  return { assigned, completed };
}

export const percentOf = (completed: number, assigned: number): number | null => (assigned > 0 ? Math.round((completed / assigned) * 100) : null);

// Mayor porcentaje primero; a igual porcentaje, más completadas; sin sesiones, al final.
export function sortRanking(rows: TeamRankingRow[]): TeamRankingRow[] {
  return [...rows].sort((a, b) => (b.percent ?? -1) - (a.percent ?? -1) || b.completed - a.completed || a.name.localeCompare(b.name, "es"));
}
