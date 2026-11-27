import type { Exercise, SessionStatus, SessionStructureInput, SessionWorkBlock } from "@cycles/shared";
import { apiRequest } from "./httpClient";

// Ciclo del equipo (CYC-314): el plan del equipo y lo que llega a cada integrante.
export interface TeamCycleSummary {
  id: string;
  name: string;
  objective: string | null;
  startDate: string;
  endDate: string;
  status: "active" | "completed" | "archived";
  // Clave de la paleta; null = azul. Ausente si la API todavía no lo conoce.
  color?: string | null;
}

export interface TeamSessionExercise {
  id: string;
  exerciseId: string;
  blockId: string | null;
  orderIndex: number;
  targetSets: number;
  targetReps: number;
  targetWeight: number | null;
  targetPercentRm: number | null;
  targetRestSeconds: number | null;
  targetRir: number | null;
  note: string | null;
  exercise: Exercise;
}

export interface TeamSessionCopy {
  sessionId: string;
  athleteId: string;
  status: SessionStatus;
  adjusted: boolean;
  // El día de ESTA copia (puede no ser el del plan) y, con la misma regla de un cambio del equipo,
  // por qué no lo recibiría hoy; null si lo recibiría (CYC-325).
  scheduledDate: string | null;
  skip: "adjusted" | "recorded" | "past" | "removed" | null;
}

export interface TeamSession {
  id: string;
  name: string;
  scheduledDate: string;
  blocks: SessionWorkBlock[];
  exercises: TeamSessionExercise[];
  // A cuántos llegó, cuántos la hicieron y cuántas copias están ajustadas.
  recipients: number;
  completed: number;
  adjusted: number;
  copies: TeamSessionCopy[];
}

export interface TeamCycleDetail extends TeamCycleSummary {
  teamId: string;
  athletes: { athleteId: string; name: string; cycleId: string; status: string }[];
  sessions: TeamSession[];
}

export interface PreviewMember {
  id: string;
  name: string;
  canReceive: boolean;
  reason: "pending_invitation" | null;
  ownCycles: { id: string; name: string; startDate: string; endDate: string }[];
}

export interface TeamCyclePreview {
  teamOverlap: { id: string; name: string; startDate: string; endDate: string }[];
  members: PreviewMember[];
}

// Qué pasó con las copias al cambiar el plan.
export interface PropagationSummary {
  updated: number;
  skipped: { adjusted: number; recorded: number; past: number; removed: number };
}

export interface RemovalImpact {
  removed: number;
  keptRecorded: number;
  keptAdjusted: number;
  keptPast: number;
}

export function listTeamCycles(teamId: string) {
  return apiRequest<TeamCycleSummary[]>(`/teams/${teamId}/cycles`);
}

// Los planes de los ciclos que se cruzan con un tramo, en una sola consulta (CYC-325).
export async function getTeamCycleDetails(teamId: string, from: string, to: string, today: string) {
  return (await apiRequest<{ cycles: TeamCycleDetail[] }>(`/teams/${teamId}/cycle-details?from=${from}&to=${to}&today=${today}`)).cycles;
}

export function setTeamCycleColor(id: string, color: string) {
  return apiRequest<TeamCycleDetail>(`/team-cycles/${id}`, { method: "PATCH", body: { color } });
}

export function getTeamCycle(id: string) {
  return apiRequest<TeamCycleDetail>(`/team-cycles/${id}`);
}

export function previewTeamCycle(teamId: string, data: { startDate: string; endDate: string; today: string }) {
  return apiRequest<TeamCyclePreview>(`/teams/${teamId}/cycles/preview`, { method: "POST", body: data });
}

export function createTeamCycle(teamId: string, data: { name: string; objective?: string; startDate: string; endDate: string; athleteIds: string[]; today: string }) {
  return apiRequest<TeamCycleDetail>(`/teams/${teamId}/cycles`, { method: "POST", body: data });
}

export function updateTeamCycle(id: string, data: { name?: string; objective?: string; startDate?: string; endDate?: string; today?: string }) {
  return apiRequest<TeamCycleDetail>(`/team-cycles/${id}`, { method: "PATCH", body: data });
}

export function teamCycleRemovalImpact(id: string, today: string) {
  return apiRequest<RemovalImpact>(`/team-cycles/${id}/removal-impact?today=${today}`);
}

export function deleteTeamCycle(id: string, today: string) {
  return apiRequest<void>(`/team-cycles/${id}?today=${today}`, { method: "DELETE" });
}

export function joinTeamCycle(id: string, athleteIds: string[], today: string) {
  return apiRequest<{ delivered: number }>(`/team-cycles/${id}/members`, { method: "POST", body: { athleteIds, today } });
}

export function memberRemovalImpact(teamId: string, athleteId: string, today: string) {
  return apiRequest<RemovalImpact>(`/teams/${teamId}/members/${athleteId}/removal-impact?today=${today}`);
}

export function addTeamSession(cycleId: string, data: { routineId: string; scheduledDate: string; today: string }) {
  return apiRequest<{ sessionId: string; delivered: number }>(`/team-cycles/${cycleId}/sessions`, { method: "POST", body: data });
}

export function duplicateTeamSession(id: string, data: { scheduledDate: string; today: string }) {
  return apiRequest<{ sessionId: string; delivered: number }>(`/team-sessions/${id}/duplicate`, { method: "POST", body: data });
}

export function moveTeamSession(id: string, data: { scheduledDate: string; today: string }) {
  return apiRequest<PropagationSummary>(`/team-sessions/${id}`, { method: "PATCH", body: data });
}

export function saveTeamSessionStructure(id: string, data: SessionStructureInput, today: string) {
  return apiRequest<PropagationSummary>(`/team-sessions/${id}/structure?today=${today}`, { method: "PUT", body: data });
}

export function deleteTeamSession(id: string, today: string) {
  return apiRequest<PropagationSummary>(`/team-sessions/${id}?today=${today}`, { method: "DELETE" });
}
