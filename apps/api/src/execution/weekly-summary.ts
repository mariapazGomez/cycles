import type { WeeklySummary } from "@cycles/shared";
import { addDays, plannedCalendarWeek } from "../common/training";

// Resumen semanal del atleta para Hoy (CYC-261). Función pura: la consulta vive en el servicio.
// Una sesión cuenta en la semana en que estaba planeada, la misma regla del resumen del coach
// (plannedCalendarWeek); su tiempo y su esfuerzo salen de su cierre vigente.
export interface RawWeeklySession {
  cycleStart: Date;
  weekNumber: number;
  status: "pending" | "completed" | "skipped";
  feedback: { srpe: number | null; durationMinutes: number | null } | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const day = (d: Date) => d.toISOString().slice(0, 10);

// `weekStart`: lunes (medianoche UTC) de la semana pedida.
export function buildWeeklySummary(weekStart: Date, sessions: RawWeeklySession[]): WeeklySummary {
  const inWeek = sessions.filter((s) => plannedCalendarWeek(s.cycleStart, s.weekNumber).getTime() === weekStart.getTime());
  const done = inWeek.filter((s) => s.status === "completed");
  const minutes = done.map((s) => s.feedback?.durationMinutes).filter((m): m is number => typeof m === "number");
  const efforts = done.map((s) => s.feedback?.srpe).filter((e): e is number => typeof e === "number");
  return {
    weekStart: day(weekStart),
    weekEnd: day(addDays(weekStart, 6)),
    sessionsPlanned: inWeek.length,
    sessionsDone: done.length,
    minutesTrained: minutes.length > 0 ? minutes.reduce((a, b) => a + b, 0) : null,
    averageSrpe: efforts.length > 0 ? round1(efforts.reduce((a, b) => a + b, 0) / efforts.length) : null,
  };
}
