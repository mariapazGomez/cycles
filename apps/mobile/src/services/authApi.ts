import type { User } from '@cycles/shared';
import { apiRequest } from './httpClient';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export function login(data: { email: string; password: string }) {
  return apiRequest<AuthTokens>('/auth/login', {
    method: 'POST',
    auth: false,
    body: data,
  });
}

// Inicio de sesión con Apple: el token de identidad y el nonce con que se pidió.
export function loginWithApple(data: { idToken: string; nonce: string }) {
  return apiRequest<AuthTokens>('/auth/apple', {
    method: 'POST',
    auth: false,
    body: data,
  });
}

// Inicio de sesión con Google: el token de identidad y el nonce con que se pidió.
export function loginWithGoogle(data: { idToken: string; nonce: string }) {
  return apiRequest<AuthTokens>('/auth/google/token', {
    method: 'POST',
    auth: false,
    body: data,
  });
}

export function logout(refreshToken: string) {
  return apiRequest<void>('/auth/logout', {
    method: 'POST',
    auth: false,
    body: { refreshToken },
  });
}

// Quien ya tenía cuenta acepta la versión vigente de los Términos y la Política.
export function acceptPolicy() {
  return apiRequest<void>('/users/me/policy-acceptance', {
    method: 'POST',
    body: { acceptPolicy: true },
  });
}

export function fetchCurrentUser() {
  return apiRequest<User>('/users/me');
}
