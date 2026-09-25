import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@cycles/shared';
import * as authApi from '../services/authApi';
import { tokenStore } from '../services/tokenStore';

interface AuthContextValue {
  status: 'loading' | 'signedOut' | 'signedIn';
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'signedOut' | 'signedIn'>('loading');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    (async () => {
      await tokenStore.load();
      if (!tokenStore.getAccessToken()) {
        setStatus('signedOut');
        return;
      }
      try {
        const currentUser = await authApi.fetchCurrentUser();
        setUser(currentUser);
        setStatus('signedIn');
      } catch {
        await tokenStore.clear();
        setStatus('signedOut');
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const tokens = await authApi.login({ email, password });
    await tokenStore.setTokens(tokens);
    const currentUser = await authApi.fetchCurrentUser();
    if (currentUser.role !== 'athlete') {
      await tokenStore.clear();
      throw new Error('Esta app es solo para atletas. Ingresa desde la web si eres coach.');
    }
    setUser(currentUser);
    setStatus('signedIn');
  };

  const logout = async () => {
    const refreshToken = tokenStore.getRefreshToken();
    await tokenStore.clear();
    setUser(null);
    setStatus('signedOut');
    if (refreshToken) {
      authApi.logout(refreshToken).catch(() => {
        // Best-effort: si falla, el refresh token igual quedó borrado localmente.
      });
    }
  };

  const value = useMemo(() => ({ status, user, login, logout }), [status, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
