import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { AuthProvider, useAuth } from '../src/store/AuthContext';
import * as authApi from '../src/services/authApi';
import { tokenStore } from '../src/services/tokenStore';
import { ApiError } from '../src/services/httpClient';

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
