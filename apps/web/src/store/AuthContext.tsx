import { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@cycles/shared";
import * as authApi from "../services/authApi";
import { tokenStore, type StoredTokens } from "../services/tokenStore";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  loginWithTokens: (tokens: StoredTokens) => Promise<User>;
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

  useEffect(() => {
    if (!tokenStore.getAccessToken()) {
      setStatus("unauthenticated");
      return;
    }
    loadCurrentUser().catch(() => {
      tokenStore.clear();
      setUser(null);
      setStatus("unauthenticated");
    });
  }, [loadCurrentUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const tokens = await authApi.login({ email, password });
      tokenStore.setTokens(tokens);
      return loadCurrentUser();
    },
    [loadCurrentUser],
  );

  const loginWithTokens = useCallback(
    async (tokens: StoredTokens) => {
      tokenStore.setTokens(tokens);
      return loadCurrentUser();
    },
    [loadCurrentUser],
  );

  const logout = useCallback(async () => {
    const refreshToken = tokenStore.getRefreshToken();
    tokenStore.clear();
    setUser(null);
    setStatus("unauthenticated");
    if (refreshToken) {
      // Best-effort: si falla (token ya expirado, red caída) igual cerramos
      // sesión localmente.
      await authApi.logout(refreshToken).catch(() => undefined);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, loginWithTokens, logout, refreshCurrentUser: loadCurrentUser }),
    [status, user, login, loginWithTokens, logout, loadCurrentUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
