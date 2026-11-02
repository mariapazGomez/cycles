import { tokenStore } from "./tokenStore";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  // false para endpoints públicos (login, register, ...): no adjunta el
  // access token ni intenta refrescar sesión ante un 401.
  auth?: boolean;
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (Array.isArray(data?.message)) {
      return data.message.join(" ");
    }
    if (typeof data?.message === "string") {
      return data.message;
    }
  } catch {
    // Respuesta sin cuerpo JSON: se usa el mensaje genérico de abajo.
  }
  return "Ocurrió un error inesperado. Intenta de nuevo.";
}

// La web se identifica ante la API para que entregue el refresh token en una cookie
// `httpOnly` (nunca en el cuerpo) y la lea de ahí. Con `credentials: "include"` el
// navegador manda y guarda esa cookie aunque la API esté en otro subdominio.
const WEB_CLIENT_HEADERS = { "X-Cycles-Client": "web" };

// Evita disparar varios refresh en paralelo si varias requests reciben 401 a la vez.
let refreshInFlight: Promise<void> | null = null;

// El refresh token rota en cada uso y reusar uno viejo cierra todas las sesiones
// (R2). Dos pestañas que refrescan a la vez con la misma cookie lo provocarían, así
// que el refresh se hace de a una pestaña por vez (Web Locks).
function withRefreshLock<T>(run: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  return locks ? (locks.request("cycles-refresh", run) as Promise<T>) : run();
}

// Pide un access token nuevo con la cookie de la sesión. También restaura la sesión
// al cargar la página (el access token solo vive en memoria).
export function refreshSession(): Promise<void> {
  if (!refreshInFlight) {
    refreshInFlight = withRefreshLock(async () => {
      // Puente: una sesión guardada antes de la cookie se cambia por la cookie.
      const legacyToken = tokenStore.takeLegacyRefreshToken();
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...WEB_CLIENT_HEADERS },
        body: JSON.stringify(legacyToken ? { refreshToken: legacyToken } : {}),
      });

      if (!response.ok) {
        tokenStore.clear();
        throw new ApiError(401, "Sesión expirada");
      }

      const { accessToken } = (await response.json()) as { accessToken: string };
      tokenStore.setAccessToken(accessToken);
    }).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
  isRetry = false,
): Promise<T> {
  const { method = "GET", body, auth = true } = options;
  const headers: Record<string, string> = { "Content-Type": "application/json", ...WEB_CLIENT_HEADERS };

  if (auth) {
    const accessToken = tokenStore.getAccessToken();
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && auth && !isRetry) {
    await refreshSession();
    return apiRequest<T>(path, options, true);
  }

  if (!response.ok) {
    throw new ApiError(response.status, await extractErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  // NestJS responde 200 con el cuerpo vacío cuando el handler devuelve null
  // (p. ej. GET /me/today sin sesiones pendientes): response.json() fallaría,
  // así que se lee como texto primero. Mismo arreglo que la app móvil.
  const text = await response.text();
  if (text === "") {
    return null as T;
  }
  return JSON.parse(text) as T;
}
