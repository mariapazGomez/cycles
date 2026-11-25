// Calendario y ciclos de un equipo (CYC-318, docs/diseno/equipos-sidebar). Lógica pura.
import type { AthleteEventOccurrence, EventType } from "@cycles/shared";
import type { BoardSession } from "./weekBoard";

export interface MemberSessions {
  athleteId: string;
  sessions: BoardSession[];
}

// Una tarjeta del día: la misma sesión (por nombre) de varios atletas, con cuántos la hicieron.
export interface TeamSessionCard {
  key: string;
  name: string;
  done: number;
  total: number;
  // Ids de las sesiones que agrupa, para abrir la primera.
  sessionIds: string[];
}

export function sessionCards(members: MemberSessions[], dayIso: string): TeamSessionCard[] {
  const byName = new Map<string, TeamSessionCard>();
  for (const m of members) {
    for (const s of m.sessions) {
      if (s.dayIso !== dayIso) continue;
      const name = s.name.trim() || "Sesión";
      const card = byName.get(name.toLowerCase()) ?? { key: name.toLowerCase(), name, done: 0, total: 0, sessionIds: [] };
      card.total += 1;
      if (s.status === "completed") card.done += 1;
      card.sessionIds.push(s.id);
      byName.set(card.key, card);
    }
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export type BadgeTone = "ok" | "warn" | "pending";

// «10 de 12» (verde si todos, naranja si faltan) o «Pendiente» si aún nadie la hizo y no pasó.
export function sessionBadge(card: Pick<TeamSessionCard, "done" | "total">, dayIso: string, todayIso: string): { text: string; tone: BadgeTone } {
  if (card.done === 0 && dayIso >= todayIso) return { text: "Pendiente", tone: "pending" };
  return { text: `${card.done} de ${card.total}`, tone: card.done === card.total ? "ok" : "warn" };
}

const EVENT_LABEL: Record<EventType, string> = {
  match: "Partido",
  training: "Entrenamiento",
  travel: "Viaje",
  rest: "Descanso",
  injury: "Lesión",
  other: "Actividad",
};

export function eventTypeLabel(type: EventType): string {
  return EVENT_LABEL[type] ?? "Actividad";
}

export interface MemberEvents {
  athleteId: string;
  athleteName: string;
  events: AthleteEventOccurrence[];
}

// Lo que agregaron los atletas, en una línea por tipo: «Viaje: Matías» si es uno, «Descanso: 2» si son varios.
export function eventLines(members: MemberEvents[], dayIso: string): string[] {
  const byType = new Map<string, Set<string>>();
  const names = new Map<string, string>();
  for (const m of members) {
    for (const e of m.events) {
      if (e.date.slice(0, 10) !== dayIso) continue;
      const label = eventTypeLabel(e.type);
      byType.set(label, (byType.get(label) ?? new Set()).add(m.athleteId));
      names.set(m.athleteId, m.athleteName.split(" ")[0]);
    }
  }
  return [...byType.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "es"))
    .map(([label, ids]) => `${label}: ${ids.size === 1 ? names.get([...ids][0]) : ids.size}`);
}

// «(GMT-3)» según la zona del navegador (minutos como los da getTimezoneOffset).
export function gmtLabel(offsetMinutes: number): string {
  const total = -offsetMinutes;
  const sign = total >= 0 ? "+" : "-";
  const h = Math.floor(Math.abs(total) / 60);
  const m = Math.abs(total) % 60;
  return `GMT${total === 0 ? "" : `${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`}`;
}
