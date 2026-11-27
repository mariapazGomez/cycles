import type { CreateTeamEventInput, RankingPeriod, TeamCalendarResponse, TeamEventSeries, TeamRankingsResponse } from "@cycles/shared";
import { apiRequest } from "./httpClient";

// Eventos, calendario y ranking de un equipo del coach (API de CYC-317).
export function getTeamCalendar(teamId: string, from: string, to: string) {
  return apiRequest<TeamCalendarResponse>(`/teams/${teamId}/calendar?from=${from}&to=${to}`);
}

// Solo los eventos del equipo, sin lo que agregó cada atleta.
export async function listTeamEvents(teamId: string, from: string, to: string) {
  return (await apiRequest<{ events: TeamCalendarResponse["teamEvents"] }>(`/teams/${teamId}/events?from=${from}&to=${to}`)).events;
}

export function createTeamEvent(teamId: string, data: CreateTeamEventInput) {
  return apiRequest<TeamEventSeries>(`/teams/${teamId}/events`, { method: "POST", body: data });
}

// Editar y eliminar cambian toda la serie.
export function updateTeamEvent(teamId: string, eventId: string, data: CreateTeamEventInput) {
  return apiRequest<TeamEventSeries>(`/teams/${teamId}/events/${eventId}`, { method: "PATCH", body: data });
}

export function deleteTeamEvent(teamId: string, eventId: string) {
  return apiRequest<void>(`/teams/${teamId}/events/${eventId}`, { method: "DELETE" });
}

export function getTeamRankings(teamId: string, period: RankingPeriod) {
  return apiRequest<TeamRankingsResponse>(`/teams/${teamId}/rankings?period=${period}`);
}
