import { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@cycles/shared";
import * as authApi from "../services/authApi";
import { tokenStore } from "../services/tokenStore";
import { refreshSession } from "../services/httpClient";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  loginWithTokens: (tokens: authApi.AuthTokens) => Promise<User>;
  logout: () => Promise<void>;
  refreshCurrentUser: () => Promise<User>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);

  const loadCurrentUser = useCallback(async (): Promise<User> => {
    const currentUser = await authApi.fetchCurrentUser();
    setUser(currentUser);
    setStatus("authenticated");
    return currentUser;
  }, []);

  // Al cargar la página no hay access token (vive solo en memoria): se restaura la
  // sesión con la cookie. Sin la marca de sesión no se llama a la API (la landing
  // y las pantallas públicas aparecen al instante).
  useEffect(() => {
    if (!tokenStore.hasSessionHint()) {
      setStatus("unauthenticated");
      return;
    }
    refreshSession()
      .then(() => loadCurrentUser())
      .catch(() => {
        tokenStore.clear();
        setUser(null);
        setStatus("unauthenticated");
      });
  }, [loadCurrentUser]);

  // Si se cierra sesión en otra pestaña, esta también se cierra.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === tokenStore.SESSION_HINT_KEY && event.newValue === null) {
        tokenStore.clear();
        setUser(null);
        setStatus("unauthenticated");
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const tokens = await authApi.login({ email, password });
      tokenStore.setAccessToken(tokens.accessToken);
      return loadCurrentUser();
    },
    [loadCurrentUser],
  );

  const loginWithTokens = useCallback(
    async (tokens: authApi.AuthTokens) => {
      tokenStore.setAccessToken(tokens.accessToken);
      return loadCurrentUser();
    },
    [loadCurrentUser],
  );

  const logout = useCallback(async () => {
    tokenStore.clear();
    setUser(null);
    setStatus("unauthenticated");
    // Best-effort: si falla (cookie ya vencida, red caída) igual cerramos sesión
    // localmente. La API revoca el token y borra la cookie.
    await authApi.logout().catch(() => undefined);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, loginWithTokens, logout, refreshCurrentUser: loadCurrentUser }),
    [status, user, login, loginWithTokens, logout, loadCurrentUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
