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

// Lo que la página de la invitación necesita: quién invita y si ya hay cuenta.
export function previewInvitation(token: string) {
  return apiRequest<{ coachName: string; hasAccount: boolean }>("/athletes/invitations/preview", {
    method: "POST",
    auth: false,
    body: { token },
  });
}

// Cuenta nueva: devuelve la sesión. Atleta que ya tenía cuenta: solo `linked`.
export type AcceptInvitationResult = ({ linked: false } & AuthTokens) | { linked: true };

export function acceptInvitation(data: { token: string; password?: string; acceptPolicy: boolean }) {
  return apiRequest<AcceptInvitationResult>("/athletes/invitations/accept", {
    method: "POST",
    auth: false,
    body: data,
  });
}
