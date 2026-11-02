import type { User } from "@cycles/shared";
import { API_URL, apiRequest } from "./httpClient";

// La web solo recibe el access token: el refresh token viaja en una cookie
// `httpOnly` (CYC-89, S-08).
export interface AuthTokens {
  accessToken: string;
}

interface MessageResponse {
  message: string;
}

export type SelfRole = "coach" | "athlete";

// El registro ofrece las dos opciones. Un atleta que se registra solo queda sin
// coach hasta que uno lo invite con el mismo correo (ver PRD-General, sección 4).
export function register(data: {
  role: SelfRole;
  name: string;
  email: string;
  password: string;
  dataConsent: boolean;
  acceptPolicy: boolean;
  accessCode?: string;
}) {
  return apiRequest<{ id: string; email: string }>("/auth/register", {
    method: "POST",
    auth: false,
    body: data,
  });
}

export function login(data: { email: string; password: string }) {
  return apiRequest<AuthTokens>("/auth/login", {
    method: "POST",
    auth: false,
    body: data,
  });
}

// Cambia el código de un solo uso que deja el callback de Google por la sesión.
export function exchangeGoogleCode(code: string) {
  return apiRequest<AuthTokens>("/auth/google/exchange", {
    method: "POST",
    auth: false,
    body: { code },
  });
}

// La API revoca el refresh token de la cookie y la borra.
export function logout() {
  return apiRequest<void>("/auth/logout", {
    method: "POST",
    auth: false,
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

// Quien entró con Google elige aquí su rol: coach o atleta.
export function completeProfile(data: { role: SelfRole; dataConsent: boolean; acceptPolicy: boolean }) {
  return apiRequest<MessageResponse>("/auth/complete-profile", {
    method: "POST",
    body: data,
  });
}

// Quien ya tiene cuenta acepta la versión vigente de los Términos y la Política.
export function acceptPolicy() {
  return apiRequest<void>("/users/me/policy-acceptance", {
    method: "POST",
    body: { acceptPolicy: true },
  });
}

export function googleLoginUrl(): string {
  return `${API_URL}/auth/google`;
}
