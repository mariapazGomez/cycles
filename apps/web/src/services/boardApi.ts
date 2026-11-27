import type { AthleteEventOccurrence, SessionStatus } from "@cycles/shared";
import { apiRequest } from "./httpClient";
import type { BoardSession } from "../lib/weekBoard";
import type { CoachSession } from "../lib/loadClash";
import { addDays, sessionDayIso, utcDay } from "../lib/weekCalendar";

// Consultas agrupadas del coach (CYC-325): una petición trae lo de todos sus atletas, así Inicio,
// Atletas y el calendario del equipo no piden más cuanto más atletas o ciclos hay. Si algo no cabe
// en una respuesta, llega por páginas y aquí se juntan.

export interface BoardCycle {
  id: string;
  athleteId: string;
  name: string;
  startDate: string;
  endDate: string;
  // Los ciclos creados por fechas no tienen «sesiones por semana» (CYC-314).
  sessionsPerWeek: number | null;
  teamCycleId: string | null;
  parentCycleId: string | null;
  // Series de cada sesión con día de TODO el ciclo, para saber cuál es su tercio más alto.
  datedVolumes?: number[];
}

export interface BoardRawSession {
  id: string;
  cycleId: string;
  name: string;
  weekNumber: number;
  slotNumber: number;
  // La API manda null cuando la sesión aún no tiene día.
  scheduledDate?: string;
  status: SessionStatus;
  teamSessionId: string | null;
  plannedSets?: number;
}

export interface BoardData {
  cycles: BoardCycle[];
  sessions: BoardRawSession[];
}

export interface AdherenceRow {
  athleteId: string;
  assigned: number;
  completed: number;
}

export type BoardEvent = AthleteEventOccurrence & { athleteId: string };

async function allPages<P extends { nextCursor: string | null }>(path: string, params: Record<string, string>): Promise<P[]> {
  const pages: P[] = [];
  let cursor: string | null = null;
  do {
    const query = new URLSearchParams(cursor ? { ...params, cursor } : params);
    const page: P = await apiRequest<P>(`${path}?${query}`);
    pages.push(page);
    cursor = page.nextCursor;
  } while (cursor);
  return pages;
}

export async function getBoardSessions(from: string, to: string, options: { teamId?: string; volumes?: boolean } = {}): Promise<BoardData> {
  const pages = await allPages<BoardData & { nextCursor: string | null }>("/coach/board/sessions", {
    from,
    to,
    ...(options.teamId ? { teamId: options.teamId } : {}),
    ...(options.volumes ? { volumes: "true" } : {}),
  });
  return { cycles: pages.flatMap((p) => p.cycles), sessions: pages.flatMap((p) => p.sessions) };
}

export async function getBoardEvents(from: string, to: string): Promise<BoardEvent[]> {
  const pages = await allPages<{ events: BoardEvent[]; nextCursor: string | null }>("/coach/board/events", { from, to });
  return pages.flatMap((p) => p.events);
}

export async function getBoardAdherence(weeks: number): Promise<AdherenceRow[]> {
  const pages = await allPages<{ athletes: AdherenceRow[]; nextCursor: string | null }>("/coach/board/adherence", { weeks: String(weeks) });
  return pages.flatMap((p) => p.athletes);
}

// Sesiones de un atleta entre dos días (incluidos), cada una con su día, por ciclo y en orden de
// semana y lugar. La usan la semana del Inicio y el calendario del equipo.
export function athleteSessions(data: BoardData, athleteId: string, from: string, to: string): BoardSession[] {
  const result: BoardSession[] = [];
  for (const cycle of data.cycles) {
    if (cycle.athleteId !== athleteId) continue;
    const own = data.sessions.filter((s) => s.cycleId === cycle.id).sort((a, b) => a.weekNumber - b.weekNumber || a.slotNumber - b.slotNumber);
    for (const session of own) {
      const dayIso = sessionDayIso(cycle.startDate, session, cycle.sessionsPerWeek ?? 0);
      if (utcDay(dayIso) < utcDay(from) || utcDay(dayIso) > utcDay(to)) continue;
      result.push({ id: session.id, name: session.name, status: session.status, dayIso, pain: false, teamCycleId: cycle.teamCycleId, teamSessionId: session.teamSessionId });
    }
  }
  return result;
}

// Semana calendario que empieza en `monday`.
export function athleteWeek(data: BoardData, athleteId: string, monday: string): BoardSession[] {
  return athleteSessions(data, athleteId, monday, addDays(monday, 6));
}

// Las sesiones con día de un ciclo y sus series, para el choque de carga (CYC-253). Hace falta
// haber pedido las series (`volumes`).
export function cycleCoachSessions(data: BoardData, cycleId: string): CoachSession[] {
  return data.sessions
    .filter((s) => s.cycleId === cycleId && s.scheduledDate)
    .map((s) => ({ id: s.id, name: s.name, date: (s.scheduledDate as string).slice(0, 10), volume: s.plannedSets ?? 0 }));
}
