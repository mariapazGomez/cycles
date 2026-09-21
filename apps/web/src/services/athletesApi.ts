import { apiRequest } from "./httpClient";
import type { AuthTokens } from "./authApi";

export type CoachAthleteStatus = "pending" | "active" | "inactive";

export interface AthleteRelation {
  id: string;
  status: CoachAthleteStatus;
  athlete: {
    id: string;
    name: string;
    email: string;
  };
}

export function inviteAthlete(data: { email: string; name: string }) {
  return apiRequest<{ id: string; email: string }>("/athletes/invite", {
    method: "POST",
    body: data,
  });
}

export function listAthletes() {
  return apiRequest<AthleteRelation[]>("/athletes");
}

export function acceptInvitation(data: { token: string; password: string }) {
  return apiRequest<AuthTokens>("/athletes/invitations/accept", {
    method: "POST",
    auth: false,
    body: data,
  });
}
