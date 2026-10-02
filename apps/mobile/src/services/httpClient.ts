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

// Tope de espera por request. Render (plan gratuito) duerme la API tras un
// rato sin uso y la primera petición puede tardar cerca de un minuto en
// despertarla; pasado este tope se corta con un mensaje claro en vez de
// dejar la pantalla cargando sin fin.
export const REQUEST_TIMEOUT_MS = 70_000;

// Sin conexión / servidor inalcanzable: fetch() rechaza con un TypeError
// críptico ("Network request failed"). Se normaliza a un ApiError con
// status 0 para que el resto del código (y la UI) lo distinga de un
// rechazo real del servidor y muestre un mensaje entendible. El timeout
// también es status 0: no es un rechazo del servidor, así que no debe
// borrar la sesión guardada.
async function safeFetch(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    throw new ApiError(
      0,
      controller.signal.aborted
        ? 'El servidor tardó demasiado en responder. Intenta de nuevo.'
        : 'No pudimos conectar con el servidor. Revisa tu conexión.',
    );
  } finally {
    clearTimeout(timer);
  }
}

// Despierta la API en segundo plano al abrir la app, para que cuando la
// persona termine de escribir sus datos el servidor ya esté listo.
export function warmUpApi(): void {
  fetch(`${API_URL}/health`).catch(() => {
    // Best-effort: si falla, el login mostrará su propio error.
  });
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
