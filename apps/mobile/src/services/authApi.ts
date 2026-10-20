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
