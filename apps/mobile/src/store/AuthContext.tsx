import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@cycles/shared';
import * as authApi from '../services/authApi';
import { ApiError, onSessionExpired } from '../services/httpClient';
import { tokenStore } from '../services/tokenStore';

interface AuthContextValue {
  status: 'loading' | 'signedOut' | 'signedIn';
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithApple: (credential: { idToken: string; nonce: string }) => Promise<void>;
  logout: () => Promise<void>;
  // Acepta los Términos y la Política vigentes y recarga el perfil (T-147).
  acceptPolicy: () => Promise<void>;
  // true entre el inicio de sesión y el final de la animación de bienvenida.
  welcome: boolean;
  endWelcome: () => void;
  // Vuelve a pedir el perfil (p. ej. tras cambiar el consentimiento).
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Guarda los tokens y devuelve a la persona, solo si es atleta: esta app no es para coaches.
async function startSession(tokens: authApi.AuthTokens): Promise<User> {
  await tokenStore.setTokens(tokens);
  const currentUser = await authApi.fetchCurrentUser();
  if (currentUser.role !== 'athlete') {
    await tokenStore.clear();
    throw new Error('Esta app es solo para atletas. Ingresa desde la web si eres coach.');
  }
  return currentUser;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'signedOut' | 'signedIn'>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [welcome, setWelcome] = useState(false);
  const endWelcome = useCallback(() => setWelcome(false), []);

  useEffect(() => {
    onSessionExpired(() => {
      setUser(null);
      setStatus('signedOut');
    });
    return () => onSessionExpired(null);
  }, []);

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
      } catch (err) {
        // Solo se borra la sesión guardada si el servidor la rechazó de
        // verdad (ApiError con status real). Un fallo de red (status 0,
        // ver httpClient.safeFetch) no debe deslogear: sin esto, abrir la
        // app sin conexión borraba el refresh token y obligaba a
        // reingresar credenciales aunque la sesión siguiera siendo válida.
        if (err instanceof ApiError && err.status !== 0) {
          await tokenStore.clear();
        }
        setStatus('signedOut');
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    setUser(await startSession(await authApi.login({ email, password })));
    setWelcome(true);
    setStatus('signedIn');
  };

  const loginWithApple = async (credential: { idToken: string; nonce: string }) => {
    setUser(await startSession(await authApi.loginWithApple(credential)));
    setWelcome(true);
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

  const acceptPolicy = async () => {
    await authApi.acceptPolicy();
    setUser(await authApi.fetchCurrentUser());
  };

  const refreshUser = async () => {
    setUser(await authApi.fetchCurrentUser());
  };

  const value = useMemo(
    () => ({ status, user, welcome, endWelcome, login, loginWithApple, logout, acceptPolicy, refreshUser }),
    [status, user, welcome, endWelcome],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
