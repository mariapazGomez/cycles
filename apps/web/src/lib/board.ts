// Reglas de la pizarra del ciclo (docs/diseno/ciclos-pizarra). Funciones puras,
// sin red: qué días aceptan sesiones y cuáles se pueden mover o quitar. Todo en
// días "AAAA-MM-DD"; el servidor repite estas reglas y es quien manda.
import type { TrainingSession } from "@cycles/shared";
import { addDays, sessionOffset, utcDay, weekStartIso } from "./weekCalendar";
import { totalWeeks } from "./planGrid";

export type DayState = "ok" | "past" | "out";

export interface BoardRange {
  startDate: string;
  endDate: string;
  // Día local del coach: las sesiones solo se asignan desde hoy.
  today: string;
}

export function dayState(iso: string, range: BoardRange): DayState {
  if (iso < range.startDate.slice(0, 10) || iso > range.endDate.slice(0, 10)) return "out";
  return iso < range.today ? "past" : "ok";
}

// Solo las pendientes se mueven: una hecha o una omitida llevan el registro del atleta.
export function canMove(session: Pick<TrainingSession, "status">): boolean {
  return session.status === "pending";
}

export function canRemove(session: Pick<TrainingSession, "status">): boolean {
  return session.status !== "completed";
}

// Una sesión sin fecha propia (o con una fuera de su semana) cae en el día que
// sugiere su lugar: se marca como tentativa hasta que tenga fecha.
export function isTentative(startDate: string, session: Pick<TrainingSession, "weekNumber" | "scheduledDate">): boolean {
  if (!session.scheduledDate) return true;
  const diff = Math.round(
    (utcDay(session.scheduledDate) - utcDay(weekStartIso(startDate, session.weekNumber))) / 86_400_000,
  );
  return diff < 0 || diff > 6;
}

export interface BoardDay {
  iso: string;
  state: DayState;
  sessions: TrainingSession[];
}

export interface BoardWeek {
  week: number;
  first: string;
  days: BoardDay[];
}

export function buildWeeks(
  cycle: { startDate: string; endDate: string; sessionsPerWeek?: number | null },
  sessions: TrainingSession[],
  today: string,
): BoardWeek[] {
  const range: BoardRange = { startDate: cycle.startDate, endDate: cycle.endDate, today };
  const slots = cycle.sessionsPerWeek ?? 0;
  return Array.from({ length: totalWeeks(cycle.startDate, cycle.endDate) }, (_, i) => {
    const week = i + 1;
    const first = weekStartIso(cycle.startDate, week);
    const days: BoardDay[] = Array.from({ length: 7 }, (_, offset) => {
      const iso = addDays(first, offset);
      return { iso, state: dayState(iso, range), sessions: [] };
    });
    sessions
      .filter((s) => s.weekNumber === week)
      .sort((x, y) => x.slotNumber - y.slotNumber)
      .forEach((s) => {
        days[sessionOffset(cycle.startDate, week, s.slotNumber, slots, s.scheduledDate)].sessions.push(s);
      });
    return { week, first, days };
  });
}

// Día en que está una sesión hoy (null si todavía no tiene uno propio).
export function currentDayOf(session: Pick<TrainingSession, "scheduledDate">): string | null {
  return session.scheduledDate ? session.scheduledDate.slice(0, 10) : null;
}

// Los días que aceptan una sesión, agrupados por semana, para los selectores.
export function validDaysByWeek(weeks: BoardWeek[], exclude?: string | null): { week: number; days: string[] }[] {
  return weeks
    .map((w) => ({ week: w.week, days: w.days.filter((d) => d.state === "ok" && d.iso !== exclude).map((d) => d.iso) }))
    .filter((w) => w.days.length > 0);
}

// Deshacer un movimiento lo devuelve a su día de origen; si ese día ya pasó (o la
// sesión no tenía día), el servidor no lo aceptaría y el aviso no ofrece Deshacer.
export function canUndoMove(origin: string | null, range: BoardRange): boolean {
  return origin !== null && dayState(origin, range) === "ok";
}

// Semana (1 en adelante) del ciclo a la que pertenece un día; la misma regla del servidor.
export function weekOfDay(startDate: string, iso: string): number {
  const diff = Math.round((utcDay(iso) - utcDay(startDate)) / 86_400_000);
  return diff < 0 ? 0 : Math.floor(diff / 7) + 1;
}
