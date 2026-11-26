import { apiRequest } from "./httpClient";

// Equipos del coach (CYC-309/310). Solo agrupan a atletas que el coach ya tiene.
export interface TeamSummary {
  id: string;
  name: string;
  createdAt: string;
  memberCount: number;
  // Los primeros atletas, para el apilado de avatares.
  members: { id: string; name: string }[];
}

export interface TeamAthlete {
  id: string;
  name: string;
  email: string;
  // pending: invitación sin aceptar; active: ya está en Cycles.
  status: "pending" | "active" | "inactive";
  currentCycle: { id: string; name: string; startDate: string; endDate: string } | null;
  addedAt: string;
}

export interface TeamDetail {
  id: string;
  name: string;
  createdAt: string;
  athletes: TeamAthlete[];
}

export function listTeams() {
  return apiRequest<TeamSummary[]>("/teams");
}

export function getTeam(id: string) {
  return apiRequest<TeamDetail>(`/teams/${id}`);
}

export function createTeam(data: { name: string; athleteIds?: string[] }) {
  return apiRequest<TeamDetail>("/teams", { method: "POST", body: data });
}

export function renameTeam(id: string, name: string) {
  return apiRequest<TeamDetail>(`/teams/${id}`, { method: "PATCH", body: { name } });
}

// `today` (día local del coach) decide qué sesiones del ciclo del equipo son futuras.
export function deleteTeam(id: string, today: string) {
  return apiRequest<void>(`/teams/${id}?today=${today}`, { method: "DELETE" });
}

export function addTeamMembers(id: string, athleteIds: string[]) {
  // `pendingTeamCycles`: ciclos del equipo en curso o por venir, para preguntar si se asignan.
  return apiRequest<TeamDetail & { pendingTeamCycles?: { id: string; name: string; startDate: string; endDate: string }[] }>(`/teams/${id}/members`, { method: "POST", body: { athleteIds } });
}

export function removeTeamMember(id: string, athleteId: string, today: string) {
  return apiRequest<void>(`/teams/${id}/members/${athleteId}?today=${today}`, { method: "DELETE" });
}
