// Planificar desde el calendario del equipo (docs/diseno/calendario-equipo-arrastre). Lógica pura.
import type { TeamCycleDetail, TeamCycleSummary, TeamSession } from "../services/teamCyclesApi";
import { teamWeeks, type BadgeInfo } from "./teamCycle";
import type { MemberSessions } from "./teamCalendar";

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

export function inTeamCycle(cycles: Range[], iso: string): boolean {
  return cycles.some((c) => c.status !== "archived" && covers(c, iso));
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

// Por qué no se puede planificar con los filtros puestos (solo existen en la vista Mes).
export function planBlock(view: { mode: "week" | "month"; personId: string; typeFilter: string }): string | null {
  if (view.mode !== "month") return null;
  if (view.personId !== "") {
    return "Estás viendo a una persona. Para asignar al equipo, elige «Todas las personas». Para cambiar solo lo de esa persona, abre su ficha.";
  }
  return view.typeFilter === "all" || view.typeFilter === "sessions" ? null : "Muestra las sesiones para asignar rutinas.";
}

// Las sesiones de cada atleta que no son del plan que ya se muestra: las propias y las copias de
// otro equipo (la persona puede estar en dos). Una copia del plan de este equipo, ajustada o no,
// no se repite. Si la sesión del equipo se quitó y quedó la ajustada, vuelve a mostrarse.
export function ownSessions(members: MemberSessions[], planIds: Set<string>, teamCycleIds: Set<string>): { own: MemberSessions[]; otherTeam: MemberSessions[] } {
  const own: MemberSessions[] = [];
  const otherTeam: MemberSessions[] = [];
  for (const member of members) {
    const rest = member.sessions.filter((s) => !(s.teamSessionId && planIds.has(s.teamSessionId)));
    const foreign = (s: (typeof rest)[number]) => Boolean(s.teamSessionId && s.teamCycleId && !teamCycleIds.has(s.teamCycleId));
    own.push({ athleteId: member.athleteId, sessions: rest.filter((s) => !foreign(s)) });
    otherTeam.push({ athleteId: member.athleteId, sessions: rest.filter(foreign) });
  }
  return { own, otherTeam };
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

// Cuántos atletas del equipo reciben el ciclo, sobre los que pueden estar en él.
export function cycleReach(cycle: Pick<TeamCycleDetail, "athletes">, athletes: { id: string; status: string }[]): { receiving: number; of: number } {
  const members = athletes.filter((a) => a.status !== "inactive");
  const receiving = new Set(cycle.athletes.filter((a) => a.status === "active").map((a) => a.athleteId));
  return { receiving: members.filter((a) => receiving.has(a.id)).length, of: members.length };
}
