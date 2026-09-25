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

export function fetchCurrentUser() {
  return apiRequest<User>('/users/me');
}
