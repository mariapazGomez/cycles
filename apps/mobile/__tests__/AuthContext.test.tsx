import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { AuthProvider, useAuth } from '../src/store/AuthContext';
import * as authApi from '../src/services/authApi';
import { tokenStore } from '../src/services/tokenStore';
import { ApiError, onSessionExpired } from '../src/services/httpClient';

jest.mock('../src/services/authApi');
jest.mock('../src/services/tokenStore', () => ({
  tokenStore: {
    load: jest.fn(),
    getAccessToken: jest.fn(),
    getRefreshToken: jest.fn(),
    setTokens: jest.fn(),
    clear: jest.fn(),
  },
}));

const api = authApi as jest.Mocked<typeof authApi>;
const store = tokenStore as jest.Mocked<typeof tokenStore>;
const athlete = { id: 'u1', role: 'athlete' } as never;

let latest: ReturnType<typeof useAuth>;
function Probe() {
  latest = useAuth();
  return null;
}

async function mount() {
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
  });
}

beforeEach(() => jest.clearAllMocks());
afterEach(() => onSessionExpired(null));

test('con sesión guardada entra directo, sin pedir login', async () => {
  store.getAccessToken.mockReturnValue('access');
  api.fetchCurrentUser.mockResolvedValue(athlete);
  await mount();
  expect(latest.status).toBe('signedIn');
  expect(store.clear).not.toHaveBeenCalled();
});

test('sin sesión guardada pide login', async () => {
  store.getAccessToken.mockReturnValue(null);
  await mount();
  expect(latest.status).toBe('signedOut');
});

test('sin conexión al abrir no borra la sesión guardada', async () => {
  store.getAccessToken.mockReturnValue('access');
  api.fetchCurrentUser.mockRejectedValue(new ApiError(0, 'sin red'));
  await mount();
  expect(latest.status).toBe('signedOut');
  expect(store.clear).not.toHaveBeenCalled();
});

test('si el servidor rechaza la sesión, la borra', async () => {
  store.getAccessToken.mockReturnValue('access');
  api.fetchCurrentUser.mockRejectedValue(new ApiError(401, 'expirada'));
  await mount();
  expect(latest.status).toBe('signedOut');
  expect(store.clear).toHaveBeenCalled();
});

test('solo salir voluntariamente borra la sesión', async () => {
  store.getAccessToken.mockReturnValue('access');
  store.getRefreshToken.mockReturnValue('refresh');
  api.fetchCurrentUser.mockResolvedValue(athlete);
  api.logout.mockResolvedValue(undefined as never);
  await mount();
  await ReactTestRenderer.act(async () => {
    await latest.logout();
  });
  expect(store.clear).toHaveBeenCalled();
  expect(latest.status).toBe('signedOut');
});

test('si el refresh falla con la sesión abierta, vuelve al login', async () => {
  store.getAccessToken.mockReturnValue('access');
  api.fetchCurrentUser.mockResolvedValue(athlete);
  const http = require('../src/services/httpClient');
  const spy = jest.spyOn(http, 'onSessionExpired');
  await mount();
  expect(latest.status).toBe('signedIn');

  // AuthProvider registró su listener; simula el aviso de httpClient.
  const listener = spy.mock.calls[0][0] as () => void;
  await ReactTestRenderer.act(async () => {
    listener();
  });
  expect(latest.status).toBe('signedOut');
  expect(latest.user).toBeNull();
});

test('entrar con Apple guarda la sesión de un atleta', async () => {
  store.getAccessToken.mockReturnValue(null);
  api.loginWithApple.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' });
  api.fetchCurrentUser.mockResolvedValue(athlete);
  await mount();
  await ReactTestRenderer.act(async () => latest.loginWithApple({ idToken: 't', nonce: 'n' }));
  expect(api.loginWithApple).toHaveBeenCalledWith({ idToken: 't', nonce: 'n' });
  expect(store.setTokens).toHaveBeenCalledWith({ accessToken: 'a', refreshToken: 'r' });
  expect(latest.status).toBe('signedIn');
});

test('entrar con Apple siendo coach no deja la sesión abierta', async () => {
  store.getAccessToken.mockReturnValue(null);
  api.loginWithApple.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' });
  api.fetchCurrentUser.mockResolvedValue({ id: 'c1', role: 'coach' } as never);
  await mount();
  let failure: unknown;
  await ReactTestRenderer.act(async () => {
    await latest.loginWithApple({ idToken: 't', nonce: 'n' }).catch(err => {
      failure = err;
    });
  });
  expect((failure as Error).message).toContain('solo para atletas');
  expect(store.clear).toHaveBeenCalled();
  expect(latest.status).toBe('signedOut');
});
