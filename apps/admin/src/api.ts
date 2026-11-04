// Cliente de la API del portal. Todo va al mismo origen (/api/*): Vercel lo
// reenvía a Render y Cloudflare Access agrega el token en cada petición.

export class SessionEnded extends Error {}
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: init?.method ?? "GET",
      credentials: "same-origin",
      headers: init?.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError("No pudimos conectarnos. Revisa tu conexión.", 0);
  }
  if (response.status === 401) throw new SessionEnded();
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Una respuesta que no es JSON (por ejemplo la página de Cloudflare) cuenta como sesión terminada.
    if (response.ok) throw new SessionEnded();
  }
  if (!response.ok) {
    const body = (data ?? {}) as { message?: string | string[]; code?: string };
    const message = Array.isArray(body.message) ? body.message[0] : body.message;
    throw new ApiError(message ?? "Algo salió mal. Inténtalo de nuevo.", response.status, body.code);
  }
  return data as T;
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: "coach" | "athlete";
  isDemo: boolean;
  createdAt: string;
  emailVerified: boolean;
  lastLoginAt: string | null;
  policy: string | null;
}
export interface UsersPage {
  page: number;
  pageSize: number;
  total: number;
  currentPolicy: string;
  items: UserRow[];
}
export interface UserDetail {
  id: string;
  name: string;
  email: string;
  role: "coach" | "athlete";
  isDemo: boolean;
  phonePlatform: string | null;
  tourStatus: string;
  createdAt: string;
  lastLoginAt: string | null;
  athletes: Array<{ name: string; status: string }>;
  coaches: Array<{ name: string; status: string }>;
}
export interface Summary {
  real: { total: number; coaches: number; athletes: number };
  demo: { total: number };
  registrations: { last7Days: number; last30Days: number };
  coachesWithInvitedAthletes: { count: number; of: number };
  athletesWithClosedSession: { count: number; of: number };
}
export interface AccessLogRow {
  email: string;
  view: string;
  detail: string | null;
  createdAt: string;
}
export interface UsageUser {
  distinctId: string;
  name: string;
  role: "coach" | "athlete";
  visits: number;
  logins: number;
  routines: number;
  cycles: number;
  sessions: number;
  lastAt: string | null;
}
export type Usage =
  | { status: "not_connected" }
  | { status: "ok"; days: 7 | 30; users: UsageUser[]; screens: Array<{ path: string; visits: number }> };
export type EmailMode = "receive" | "send" | "both";
export interface EmailRow {
  id: string;
  address: string;
  purpose: string;
  mode: EmailMode;
  service: string;
}
export interface Versions {
  api: { commit: string | null };
  database: { lastMigration: string | null; appliedAt: string | null };
  policyVersion: string;
  ios: { version: string | null; updatedAt: string | null };
}
