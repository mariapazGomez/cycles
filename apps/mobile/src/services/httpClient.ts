import { API_URL } from '../config/env';
import { tokenStore } from './tokenStore';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  // false para endpoints públicos (login): no adjunta el access token ni
  // intenta refrescar sesión ante un 401.
  auth?: boolean;
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (Array.isArray(data?.message)) {
      return data.message.join(' ');
    }
    if (typeof data?.message === 'string') {
      return data.message;
    }
  } catch {
    // Respuesta sin cuerpo JSON: se usa el mensaje genérico de abajo.
  }
  return 'Ocurrió un error inesperado. Intenta de nuevo.';
}

// Evita disparar varios refresh en paralelo si varias requests reciben 401 a la vez.
let refreshInFlight: Promise<void> | null = null;

// Sin conexión / servidor inalcanzable: fetch() rechaza con un TypeError
// críptico ("Network request failed"). Se normaliza a un ApiError con
// status 0 para que el resto del código (y la UI) lo distinga de un
// rechazo real del servidor y muestre un mensaje entendible.
async function safeFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new ApiError(0, 'No pudimos conectar con el servidor. Revisa tu conexión.');
  }
}

async function refreshSession(): Promise<void> {
  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) {
    throw new ApiError(401, 'Sesión expirada');
  }

  const response = await safeFetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    await tokenStore.clear();
    throw new ApiError(401, 'Sesión expirada');
  }

  await tokenStore.setTokens(await response.json());
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
  isRetry = false,
): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (auth) {
    const accessToken = tokenStore.getAccessToken();
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  const response = await safeFetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && auth && !isRetry) {
    if (!refreshInFlight) {
      refreshInFlight = refreshSession().finally(() => {
        refreshInFlight = null;
      });
    }
    await refreshInFlight;
    return apiRequest<T>(path, options, true);
  }

  if (!response.ok) {
    throw new ApiError(response.status, await extractErrorMessage(response));
  }

  // GET /me/today responde 200 con body vacío cuando no hay sesión pendiente
  // (NestJS serializa `null` así, no como 204): response.json() explota con
  // un body vacío, así que hay que leer como texto primero.
  const text = await response.text();
  if (text === '') {
    return null as T;
  }
  return JSON.parse(text) as T;
}
