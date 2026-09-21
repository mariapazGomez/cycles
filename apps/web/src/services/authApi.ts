import type { User } from "@cycles/shared";
import { API_URL, apiRequest } from "./httpClient";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface MessageResponse {
  message: string;
}

// El registro público solo crea cuentas de coach: el alta de atletas es
// exclusivamente por invitación (ver PRD-General, sección 4).
export function register(data: {
  name: string;
  email: string;
  password: string;
  dataConsent: boolean;
}) {
  return apiRequest<{ id: string; email: string }>("/auth/register", {
    method: "POST",
    auth: false,
    body: { ...data, role: "coach" },
  });
}

export function login(data: { email: string; password: string }) {
  return apiRequest<AuthTokens>("/auth/login", {
    method: "POST",
    auth: false,
    body: data,
  });
}

export function logout(refreshToken: string) {
  return apiRequest<void>("/auth/logout", {
    method: "POST",
    auth: false,
    body: { refreshToken },
  });
}

export function fetchCurrentUser() {
  return apiRequest<User>("/users/me");
}

export function verifyEmail(token: string) {
  return apiRequest<MessageResponse>("/auth/verify-email", {
    method: "POST",
    auth: false,
    body: { token },
  });
}

export function resendVerificationEmail(email: string) {
  return apiRequest<MessageResponse>("/auth/verify-email/resend", {
    method: "POST",
    auth: false,
    body: { email },
  });
}

export function requestPasswordReset(email: string) {
  return apiRequest<MessageResponse>("/auth/password-reset/request", {
    method: "POST",
    auth: false,
    body: { email },
  });
}

export function confirmPasswordReset(token: string, newPassword: string) {
  return apiRequest<MessageResponse>("/auth/password-reset/confirm", {
    method: "POST",
    auth: false,
    body: { token, newPassword },
  });
}

// El rol siempre es 'coach': es la única opción que acepta el backend en
// este endpoint (los atletas no completan perfil, se crean por invitación).
export function completeProfile(data: { dataConsent: boolean }) {
  return apiRequest<MessageResponse>("/auth/complete-profile", {
    method: "POST",
    body: { role: "coach", ...data },
  });
}

export function googleLoginUrl(): string {
  return `${API_URL}/auth/google`;
}
