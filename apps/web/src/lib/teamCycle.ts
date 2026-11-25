// Ciclo del equipo (CYC-314, docs/diseno/ciclo-del-equipo): reglas y textos de pantalla, puros para
// probarlos. La API repite las reglas y es quien manda.
import type { SessionStructureInput } from "@cycles/shared";
import type { PreviewMember, PropagationSummary, RemovalImpact, TeamCycleDetail, TeamCycleSummary, TeamSession } from "../services/teamCyclesApi";
import { dayState, type DayState } from "./board";
import { totalWeeks } from "./planGrid";
import { addDays, weekStartIso } from "./weekCalendar";

const day = (iso: string) => iso.slice(0, 10);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export type CyclePhase = "current" | "next" | "past";
export const PHASE_LABEL: Record<CyclePhase, string> = { current: "En curso", next: "Próximo", past: "Terminado" };

export function cyclePhase(cycle: { startDate: string; endDate: string }, today: string): CyclePhase {
  if (today < day(cycle.startDate)) return "next";
  return today > day(cycle.endDate) ? "past" : "current";
}

// El que se abre al entrar: el en curso; si no, el próximo; si no, el último que terminó.
export function defaultTeamCycle<T extends TeamCycleSummary>(cycles: T[], today: string): T | null {
  const by = (phase: CyclePhase) => cycles.filter((c) => cyclePhase(c, today) === phase).sort((a, b) => a.startDate.localeCompare(b.startDate));
  return by("current")[0] ?? by("next")[0] ?? by("past").pop() ?? null;
}

export interface TeamDay {
  iso: string;
  state: DayState;
  sessions: TeamSession[];
}

// Las filas de la pizarra: semanas de 7 días desde el primer día del ciclo.
export function teamWeeks(cycle: { startDate: string; endDate: string }, sessions: TeamSession[], today: string): { week: number; first: string; days: TeamDay[] }[] {
  const range = { startDate: cycle.startDate, endDate: cycle.endDate, today };
  return Array.from({ length: totalWeeks(cycle.startDate, cycle.endDate) }, (_, i) => {
    const first = weekStartIso(cycle.startDate, i + 1);
    const days = Array.from({ length: 7 }, (_, offset) => {
      const iso = addDays(first, offset);
      return { iso, state: dayState(iso, range), sessions: sessions.filter((s) => day(s.scheduledDate) === iso) };
    });
    return { week: i + 1, first, days };
  });
}

// Lo que dice cada tarjeta: a cuántos llega o, si ya pasó (o hoy alguien la hizo), cuántos la hicieron.
export function cardFacts(session: TeamSession, today: string): { text: string; allDone: boolean; adjusted: string | null } {
  const iso = day(session.scheduledDate);
  const showDone = iso < today || (iso === today && session.completed > 0);
  return {
    text: showDone ? `${session.completed} de ${session.recipients} hechas` : plural(session.recipients, "atleta", "atletas"),
    allDone: session.recipients > 0 && session.completed === session.recipients,
    adjusted: session.adjusted > 0 ? plural(session.adjusted, "ajustada", "ajustadas") : null,
  };
}

// «El cambio llega a 9 atletas. La sesión ajustada de Camila Rojas no cambia.» Es lo que se sabe antes
// de guardar; el aviso posterior da las cifras exactas (puede haber alguien que ya esté registrando).
export function editReach(session: TeamSession, today: string, nameOf: (athleteId: string) => string): { reach: number; kept: string | null } {
  const upcoming = day(session.scheduledDate) >= today;
  const reach = upcoming ? session.copies.filter((c) => c.status === "pending" && !c.adjusted).length : 0;
  const adjusted = session.copies.filter((c) => c.adjusted).map((c) => nameOf(c.athleteId));
  const kept =
    adjusted.length === 0 ? null : adjusted.length === 1 ? `La sesión ajustada de ${adjusted[0]} no cambia.` : `Las ${adjusted.length} sesiones ajustadas no cambian.`;
  return { reach, kept };
}

// «Cambio guardado: actualizada en 9 atletas. 1 no cambió (ajustada).»
export function savedMessage(summary: PropagationSummary, verb: "actualizada" | "quitada" = "actualizada"): string {
  const { adjusted, recorded, past, removed } = summary.skipped;
  const reasons: [number, string, string][] = [
    [adjusted, "ajustada", "ajustadas"],
    [recorded, "registrada", "registradas"],
    [past, "de un día pasado", "de días pasados"],
    [removed, "ya quitada", "ya quitadas"],
  ];
  const kept = adjusted + recorded + past + removed;
  const detail = reasons.filter(([n]) => n > 0).map(([n, one, many]) => (kept === n ? (n === 1 ? one : many) : `${n} ${n === 1 ? one : many}`));
  const head = `Cambio guardado: ${verb} en ${plural(summary.updated, "atleta", "atletas")}.`;
  return kept === 0 ? head : `${head} ${kept} no ${kept === 1 ? "cambió" : "cambiaron"} (${detail.join(", ")}).`;
}

export function sumImpacts(impacts: RemovalImpact[]): RemovalImpact {
  return impacts.reduce(
    (a, b) => ({ removed: a.removed + b.removed, keptRecorded: a.keptRecorded + b.keptRecorded, keptAdjusted: a.keptAdjusted + b.keptAdjusted, keptPast: a.keptPast + b.keptPast }),
    { removed: 0, keptRecorded: 0, keptAdjusted: 0, keptPast: 0 },
  );
}

export const hasImpact = (i: RemovalImpact) => i.removed + i.keptRecorded + i.keptAdjusted + i.keptPast > 0;

// Las líneas del aviso al sacar a una persona, o al eliminar el ciclo o el equipo (`name` ausente).
export function removalLines(impact: RemovalImpact, name?: string): string[] {
  const one = Boolean(name);
  const lines = [impact.removed === 0 ? "No hay sesiones futuras que quitar." : `${impact.removed === 1 ? "Se quita" : "Se quitan"} ${plural(impact.removed, "sesión futura", "sesiones futuras")}.`];
  const kept = (n: number) => (one ? "Conserva" : n === 1 ? "Se conserva" : "Se conservan");
  if (impact.keptRecorded > 0) lines.push(`${kept(impact.keptRecorded)} ${plural(impact.keptRecorded, "sesión ya registrada", "sesiones ya registradas")}.`);
  if (impact.keptAdjusted > 0) {
    lines.push(`${kept(impact.keptAdjusted)} ${plural(impact.keptAdjusted, "sesión que ajustaste", "sesiones que ajustaste")}${one ? ` para ${name}` : ""}.`);
  }
  if (impact.keptPast > 0) lines.push(`${kept(impact.keptPast)} ${plural(impact.keptPast, "sesión de un día pasado", "sesiones de días pasados")}.`);
  return lines;
}

// Quién queda marcado al crear: todos los que pueden recibirlo y no tienen ciclo propio en esas fechas.
// Con ciclo propio, el coach lo decide marcándolo.
export function defaultRecipients(members: PreviewMember[]): string[] {
  return members.filter((m) => m.canReceive && m.ownCycles.length === 0).map((m) => m.id);
}

export function ownCyclesNotice(members: PreviewMember[]): string | null {
  const n = members.filter((m) => m.canReceive && m.ownCycles.length > 0).length;
  if (n === 0) return null;
  return `${n === 1 ? "1 atleta ya tiene" : `${n} atletas ya tienen`} un ciclo propio en estas fechas. Si ${n === 1 ? "lo recibe" : "lo reciben"}, los dos ciclos conviven en su calendario. Decide por cada uno.`;
}

export interface MemberRow {
  id: string;
  name: string;
  receives: boolean;
  detail: string;
  canAssign: boolean;
}

// «Quién lo recibe y qué tiene de distinto».
export function memberRows(
  athletes: { id: string; name: string; status: "pending" | "active" | "inactive" }[],
  cycle: TeamCycleDetail,
  own: PreviewMember[],
  today: string,
): MemberRow[] {
  const receiving = new Set(cycle.athletes.filter((a) => a.status === "active").map((a) => a.athleteId));
  const ownNames = new Map(own.map((m) => [m.id, m.ownCycles.map((c) => `«${c.name}»`).join(" y ")]));
  return athletes
    .filter((a) => a.status !== "inactive")
    .map((a) => {
      const other = ownNames.get(a.id) ?? "";
      if (!receiving.has(a.id)) {
        const pending = a.status === "pending";
        return {
          id: a.id,
          name: a.name,
          receives: false,
          detail: pending ? "Invitación pendiente" : other ? `Sigue con ${other}.` : "Sin otro ciclo en estas fechas.",
          canAssign: !pending && cyclePhase(cycle, today) !== "past",
        };
      }
      const mine = cycle.sessions.flatMap((s) => s.copies.filter((c) => c.athleteId === a.id).map((c) => ({ ...c, date: day(s.scheduledDate) })));
      const adjusted = mine.filter((c) => c.adjusted).length;
      const due = mine.filter((c) => c.date < today || (c.date === today && c.status === "completed"));
      const progress = due.length > 0 ? `${due.filter((c) => c.status === "completed").length} de ${due.length} hechas hasta hoy` : "Al día";
      const first = adjusted > 0 ? plural(adjusted, "sesión ajustada", "sesiones ajustadas") : progress;
      return { id: a.id, name: a.name, receives: true, detail: other ? `${first}. También tiene ${other}` : first, canAssign: false };
    });
}

// Las sesiones que le llegan a quien entra hoy.
export function sessionsFromToday(cycle: { sessions: { scheduledDate: string }[] }, today: string): number {
  return cycle.sessions.filter((s) => day(s.scheduledDate) >= today).length;
}

// La sesión del plan como la pide la API, con los ids: así las copias no cambian de ids.
export function structureOf(session: TeamSession): SessionStructureInput {
  const input = (e: TeamSession["exercises"][number]) => ({
    id: e.id,
    exerciseId: e.exerciseId,
    targetSets: e.targetSets,
    targetReps: e.targetReps,
    targetWeight: e.targetWeight ?? undefined,
    targetPercentRm: e.targetPercentRm ?? undefined,
    targetRestSeconds: e.targetRestSeconds ?? undefined,
    targetRir: e.targetRir ?? undefined,
    note: e.note ?? undefined,
  });
  const ordered = [...session.exercises].sort((a, b) => a.orderIndex - b.orderIndex);
  const blocks = [...session.blocks].sort((a, b) => a.orderIndex - b.orderIndex);
  return {
    blocks: blocks.map((b) => ({
      id: b.id,
      type: b.type,
      name: b.name,
      color: b.color ?? undefined,
      note: b.note ?? undefined,
      exercises: ordered.filter((e) => e.blockId === b.id).map(input),
    })),
    exercises: ordered.filter((e) => !e.blockId).map(input),
  };
}

// La marca de una sesión en la ficha del atleta; solo mientras su ciclo sigue siendo del equipo.
export function teamMark(
  cycle: { teamCycleId?: string | null },
  session: { teamSessionId?: string | null; detachedAt?: string | null; status: string },
): "Del equipo" | "Ajustada" | "Registrada" | null {
  if (!cycle.teamCycleId || (!session.teamSessionId && !session.detachedAt)) return null;
  if (session.status === "completed") return "Registrada";
  return session.detachedAt || !session.teamSessionId ? "Ajustada" : "Del equipo";
}

// ¿El rango elegido se cruza con otro ciclo del equipo?
export function rangesCross(cycles: { startDate: string; endDate: string }[], start: string, end: string): boolean {
  return cycles.some((c) => day(c.startDate) <= end && start <= day(c.endDate));
}
