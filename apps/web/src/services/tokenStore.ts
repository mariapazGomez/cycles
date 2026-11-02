// Sesión de la web (CYC-89, S-08): el refresh token vive en una cookie `httpOnly`
// que ningún script puede leer, y el access token solo en memoria. Ya no se
// guarda ningún token en `localStorage`.
//
// Lo único que persiste es una marca sin valor secreto («hay una sesión que
// restaurar»): evita que una persona sin sesión (la landing, por ejemplo) espere
// a la API en cada carga solo para enterarse de que no tiene sesión.

const SESSION_HINT_KEY = "cycles.session";
// Claves de antes de la cookie: los tokens se guardaban aquí.
const LEGACY_ACCESS_KEY = "cycles.accessToken";
const LEGACY_REFRESH_KEY = "cycles.refreshToken";

let accessToken: string | null = null;

function safe<T>(run: () => T, fallback: T): T {
  try {
    return run();
  } catch {
    return fallback; // almacenamiento bloqueado (modo privado, etc.)
  }
}

export const tokenStore = {
  getAccessToken(): string | null {
    return accessToken;
  },

  setAccessToken(token: string): void {
    accessToken = token;
    safe(() => localStorage.setItem(SESSION_HINT_KEY, "1"), undefined);
  },

  // ¿Vale la pena intentar restaurar la sesión con la cookie?
  hasSessionHint(): boolean {
    return safe(() => localStorage.getItem(SESSION_HINT_KEY) === "1" || localStorage.getItem(LEGACY_REFRESH_KEY) !== null, false);
  },

  clear(): void {
    accessToken = null;
    safe(() => {
      localStorage.removeItem(SESSION_HINT_KEY);
      localStorage.removeItem(LEGACY_ACCESS_KEY);
      localStorage.removeItem(LEGACY_REFRESH_KEY);
    }, undefined);
  },

  // Puente temporal: quien tenía sesión antes de la cookie conserva su refresh
  // token en `localStorage`. Se lee UNA vez, se borra de ahí y la API lo cambia por
  // la cookie. Se puede quitar cuando ya no queden sesiones viejas (30 días).
  takeLegacyRefreshToken(): string | null {
    return safe(() => {
      const token = localStorage.getItem(LEGACY_REFRESH_KEY);
      localStorage.removeItem(LEGACY_REFRESH_KEY);
      localStorage.removeItem(LEGACY_ACCESS_KEY);
      return token;
    }, null);
  },

  SESSION_HINT_KEY,
};
