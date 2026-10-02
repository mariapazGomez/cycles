const mockAsync: Record<string, string> = {};
const mockKeychain: { value: string | null } = { value: null };

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getMany: jest.fn(async (keys: string[]) =>
      Object.fromEntries(keys.map(k => [k, mockAsync[k] ?? null])),
    ),
    setMany: jest.fn(async (entries: Record<string, string>) => {
      Object.assign(mockAsync, entries);
    }),
    removeMany: jest.fn(async (keys: string[]) => {
      keys.forEach(k => delete mockAsync[k]);
    }),
  },
}));

jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: { AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'thisDeviceOnly' },
  setGenericPassword: jest.fn(async (_u: string, password: string) => {
    mockKeychain.value = password;
    return {};
  }),
  getGenericPassword: jest.fn(async () =>
    mockKeychain.value === null ? false : { username: 'session', password: mockKeychain.value },
  ),
  resetGenericPassword: jest.fn(async () => {
    mockKeychain.value = null;
    return true;
  }),
}));

import { tokenStore } from '../src/services/tokenStore';

const tokens = { accessToken: 'a1', refreshToken: 'r1' };

beforeEach(() => {
  Object.keys(mockAsync).forEach(k => delete mockAsync[k]);
  mockKeychain.value = null;
});

test('guarda en el Keychain y lo recupera en el siguiente arranque', async () => {
  await tokenStore.load();
  await tokenStore.setTokens(tokens);
  expect(mockKeychain.value).toBe(JSON.stringify(tokens));
  expect(mockAsync['cycles.accessToken']).toBeUndefined();

  await tokenStore.load();
  expect(tokenStore.getAccessToken()).toBe('a1');
  expect(tokenStore.getRefreshToken()).toBe('r1');
});

test('migra una sesión antigua de AsyncStorage al Keychain', async () => {
  mockAsync['cycles.accessToken'] = 'old-a';
  mockAsync['cycles.refreshToken'] = 'old-r';
  await tokenStore.load();
  expect(tokenStore.getRefreshToken()).toBe('old-r');
  expect(JSON.parse(mockKeychain.value!)).toEqual({ accessToken: 'old-a', refreshToken: 'old-r' });
  expect(mockAsync['cycles.refreshToken']).toBeUndefined();
});

test('un Keychain heredado de una instalación anterior se descarta', async () => {
  mockKeychain.value = JSON.stringify(tokens);
  await tokenStore.load();
  expect(tokenStore.getAccessToken()).toBeNull();
  expect(mockKeychain.value).toBeNull();
});

test('clear borra la sesión', async () => {
  await tokenStore.load();
  await tokenStore.setTokens(tokens);
  await tokenStore.clear();
  expect(tokenStore.getAccessToken()).toBeNull();
  expect(mockKeychain.value).toBeNull();
});
