// Lógica del tablero "Esta semana" del Inicio del coach
// (docs/diseno/ciclo-en-calendario). Funciones puras, sin red.
import type { SessionStatus } from "@cycles/shared";
import type { AttentionItem, AttentionKind } from "../services/trackingApi";
import { addDays } from "./weekCalendar";

// Una sesión de la semana de un atleta, ya con su día.
export interface BoardSession {
  id: string;
  name: string;
  status: SessionStatus;
  // "AAAA-MM-DD"
  dayIso: string;
  pain: boolean;
}

// Los siete días (lunes a domingo) de la semana que empieza en `monday`.
export function weekDays(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

// Reparte las sesiones por día; las que caen fuera de la semana se ignoran.
export function sessionsByDay(sessions: BoardSession[], monday: string): BoardSession[][] {
  const days = weekDays(monday);
  const grouped: BoardSession[][] = days.map(() => []);
  for (const session of sessions) {
    const index = days.indexOf(session.dayIso);
    if (index >= 0) grouped[index].push(session);
  }
  return grouped;
}

export function weekSummary(sessions: BoardSession[]): { done: number; of: number } {
  return { done: sessions.filter((s) => s.status === "completed").length, of: sessions.length };
}

export function todaySummary(weeks: Array<BoardSession[] | null | undefined>, todayIso: string): { planned: number; done: number } {
  let planned = 0;
  let done = 0;
  for (const sessions of weeks) {
    for (const s of sessions ?? []) {
      if (s.dayIso !== todayIso) continue;
      planned += 1;
      if (s.status === "completed") done += 1;
    }
  }
  return { planned, done };
}

const BADGE_LABEL: Record<AttentionKind, string> = {
  pain: "Dolor reportado",
  high_load: "Carga alta",
  low_load: "Carga corta",
  low_adherence: "Sesiones sin hacer",
};

// Motivo corto que se ve bajo el nombre del atleta: el aviso más urgente y,
// si hay más, cuántos otros.
export function attentionBadge(items: AttentionItem[]): { label: string; kind: AttentionKind; extra: number } | null {
  const first = items[0];
  if (!first) return null;
  return { label: BADGE_LABEL[first.kind], kind: first.kind, extra: items.length - 1 };
}

// Ids de las sesiones con dolor reportado, para marcarlas en el tablero.
export function painSessionIds(items: AttentionItem[]): Set<string> {
  return new Set(items.filter((i) => i.kind === "pain" && i.sessionId).map((i) => i.sessionId as string));
}
