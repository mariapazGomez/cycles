// Planificar desde el calendario del equipo (docs/diseno/calendario-equipo-arrastre). Lógica pura.
import type { SessionStatus } from "@cycles/shared";
import type { TeamCycleDetail, TeamCycleSummary, TeamSession } from "../services/teamCyclesApi";
import { teamWeeks, type BadgeInfo } from "./teamCycle";

const day = (iso: string) => iso.slice(0, 10);

type Range = { startDate: string; endDate: string; status: TeamCycleSummary["status"] };

// Los ciclos del equipo que cruzan lo que se ve (los archivados no).
export function crossingCycles<T extends Range>(cycles: T[], from: string, to: string): T[] {
  return cycles
    .filter((c) => c.status !== "archived" && day(c.startDate) <= to && day(c.endDate) >= from)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

const covers = (cycle: Range, iso: string) => day(cycle.startDate) <= iso && day(cycle.endDate) >= iso;

export type DayRule = "ok" | "past" | "none";
export const DAY_WHY: Record<Exclude<DayRule, "ok">, string> = { past: "Día pasado", none: "Sin ciclo" };

// El equipo tiene un solo ciclo por fechas, así que un día lleva a lo más a uno.
export function activeCycleOn<T extends Range>(cycles: T[], iso: string): T | null {
  return cycles.find((c) => c.status === "active" && covers(c, iso)) ?? null;
}

export function dayRule(cycles: Range[], iso: string, today: string): DayRule {
  if (iso < today) return "past";
  return activeCycleOn(cycles, iso) ? "ok" : "none";
}

export function hasOpenCycle(cycles: Range[], today: string): boolean {
  return cycles.some((c) => c.status === "active" && day(c.endDate) >= today);
}

export interface PlanItem {
  cycle: TeamCycleDetail;
  session: TeamSession;
}

// Las sesiones del plan del equipo de un día.
export function planOn(details: TeamCycleDetail[], iso: string): PlanItem[] {
  return details.flatMap((cycle) => cycle.sessions.filter((s) => day(s.scheduledDate) === iso).map((session) => ({ cycle, session })));
}

// «Llega a 10» mientras nadie la hace y no pasó; si no, «9 de 10».
export function planBadge(session: Pick<TeamSession, "scheduledDate" | "recipients" | "completed">, today: string): BadgeInfo {
  const iso = day(session.scheduledDate);
  if (iso > today || (iso === today && session.completed === 0)) return { text: `Llega a ${session.recipients}`, tone: "pending" };
  const all = session.recipients > 0 && session.completed === session.recipients;
  return { text: `${session.completed} de ${session.recipients}`, tone: all ? "ok" : "warn" };
}

// Por qué no se puede planificar con el filtro puesto (solo existe en la vista Mes).
export function planBlock(view: { mode: "week" | "month"; typeFilter: string }): string | null {
  if (view.mode !== "month") return null;
  return view.typeFilter === "team" ? "Muestra las sesiones para asignar rutinas." : null;
}

export interface TeamMark {
  id: string;
  name: string;
  status: SessionStatus;
}

// Las marcas de un atleta en un día de la Semana: solo sus copias de sesiones del plan de este
// equipo, en SU día (la ajustada que movió aparece donde la tiene).
export function athleteMarks(details: TeamCycleDetail[], athleteId: string, iso: string): TeamMark[] {
  return details.flatMap((cycle) =>
    cycle.sessions.flatMap((session) =>
      session.copies
        .filter((c) => c.athleteId === athleteId && day(c.scheduledDate ?? session.scheduledDate) === iso)
        .map((c) => ({ id: c.sessionId, name: session.name, status: c.status })),
    ),
  );
}

export interface BandSegment<T> {
  cycle: T;
  // Columnas de la fila (1 a 7), ambas incluidas.
  from: number;
  to: number;
  // ¿Aquí empieza y termina de verdad el ciclo? Si no, el borde es recto y sigue en otra fila.
  starts: boolean;
  ends: boolean;
}

// Los tramos de la barra de cada ciclo en una fila de siete días.
export function bandSegments<T extends Range>(cycles: T[], week: string[]): BandSegment<T>[] {
  const first = week[0];
  const last = week[week.length - 1];
  return crossingCycles(cycles, first, last).map((cycle) => {
    const start = day(cycle.startDate);
    const end = day(cycle.endDate);
    return {
      cycle,
      from: start <= first ? 1 : week.indexOf(start) + 1,
      to: end >= last ? week.length : week.indexOf(end) + 1,
      starts: start >= first,
      ends: end <= last,
    };
  });
}

// Los días que aceptan una rutina sin arrastrar, agrupados por semana de cada ciclo.
export function pickableDays(cycles: (Range & { name: string })[], today: string): { week: number; label: string; days: string[] }[] {
  const open = cycles.filter((c) => c.status === "active" && day(c.endDate) >= today).sort((a, b) => a.startDate.localeCompare(b.startDate));
  return open.flatMap((cycle) =>
    teamWeeks(cycle, [], today)
      .map((w) => ({
        week: w.week,
        label: open.length > 1 ? `${cycle.name}, semana ${w.week}` : `Semana ${w.week}`,
        days: w.days.filter((d) => d.state === "ok").map((d) => d.iso),
      }))
      .filter((w) => w.days.length > 0),
  );
}
