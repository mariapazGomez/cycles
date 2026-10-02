jest.mock('../src/services/tokenStore', () => ({
  tokenStore: { getAccessToken: jest.fn(() => null), getRefreshToken: jest.fn(() => null), setTokens: jest.fn(), clear: jest.fn() },
}));

import { apiRequest, REQUEST_TIMEOUT_MS, warmUpApi } from '../src/services/httpClient';

afterEach(() => {
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
