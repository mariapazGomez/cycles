jest.mock('../src/services/tokenStore', () => ({
  tokenStore: { getAccessToken: jest.fn(() => null), getRefreshToken: jest.fn(() => null), setTokens: jest.fn(), clear: jest.fn() },
}));

import { tokenStore } from '../src/services/tokenStore';
import { apiRequest, onSessionExpired, REQUEST_TIMEOUT_MS, warmUpApi } from '../src/services/httpClient';

afterEach(() => {
  onSessionExpired(null);
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('si el servidor no responde a tiempo, corta con un mensaje claro y status 0', async () => {
  jest.useFakeTimers();
  globalThis.fetch = jest.fn((_url: string, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    }),
  ) as never;

  const request = apiRequest('/auth/login', { method: 'POST', auth: false });
  const assertion = expect(request).rejects.toMatchObject({
    status: 0,
    message: 'El servidor tardó demasiado en responder. Intenta de nuevo.',
  });
  await jest.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 1);
  await assertion;
});

test('warmUpApi pide /health sin lanzar errores aunque falle', async () => {
  globalThis.fetch = jest.fn(() => Promise.reject(new Error('offline'))) as never;
  expect(() => warmUpApi()).not.toThrow();
  expect((globalThis.fetch as jest.Mock).mock.calls[0][0]).toMatch(/\/health$/);
});

function respond(status: number, body: unknown = {}) {
  return Promise.resolve({
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

test('si el servidor rechaza el refresh, avisa que la sesión expiró', async () => {
  (tokenStore.getRefreshToken as jest.Mock).mockReturnValue('refresh');
  globalThis.fetch = jest.fn(() => respond(401)) as never;
  const expired = jest.fn();
  onSessionExpired(expired);

  await expect(apiRequest('/me/today')).rejects.toMatchObject({ status: 401 });
  expect(tokenStore.clear).toHaveBeenCalled();
  expect(expired).toHaveBeenCalledTimes(1);
});

test('si no hay refresh token guardado, avisa que la sesión expiró', async () => {
  (tokenStore.getRefreshToken as jest.Mock).mockReturnValue(null);
  globalThis.fetch = jest.fn(() => respond(401)) as never;
  const expired = jest.fn();
  onSessionExpired(expired);

  await expect(apiRequest('/me/today')).rejects.toMatchObject({ status: 401 });
  expect(expired).toHaveBeenCalledTimes(1);
});

test('un fallo de red durante el refresh no cierra la sesión', async () => {
  (tokenStore.getRefreshToken as jest.Mock).mockReturnValue('refresh');
  globalThis.fetch = jest.fn((url: string) =>
    String(url).endsWith('/auth/refresh') ? Promise.reject(new Error('offline')) : respond(401),
  ) as never;
  const expired = jest.fn();
  onSessionExpired(expired);

  await expect(apiRequest('/me/today')).rejects.toMatchObject({ status: 0 });
  expect(expired).not.toHaveBeenCalled();
});
