const mockStore: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getMany: jest.fn(async (keys: string[]) => Object.fromEntries(keys.map(k => [k, mockStore[k] ?? null]))),
    setMany: jest.fn(async (entries: Record<string, string>) => {
      Object.assign(mockStore, entries);
    }),
    removeMany: jest.fn(async (keys: string[]) => {
      keys.forEach(k => delete mockStore[k]);
    }),
  },
}));

import { clearRest, loadRest, saveRest } from '../src/services/restTimerStorage';

beforeEach(() => Object.keys(mockStore).forEach(k => delete mockStore[k]));

test('una pausa vigente se recupera al volver a abrir la app', async () => {
  await saveRest({ endsAt: 1_000_000 + 45_000, total: 90 });
  expect(await loadRest(1_000_000)).toEqual({ endsAt: 1_045_000, total: 90 });
});

test('una pausa que ya terminó se descarta y se borra', async () => {
  await saveRest({ endsAt: 1_000_000, total: 90 });
  expect(await loadRest(1_000_001)).toBeNull();
  expect(Object.keys(mockStore)).toHaveLength(0);
});

test('sin pausa guardada o con datos ilegibles devuelve null', async () => {
  expect(await loadRest(1)).toBeNull();
  mockStore['cycles.restTimer.endsAt'] = 'abc';
  mockStore['cycles.restTimer.total'] = '90';
  expect(await loadRest(1)).toBeNull();
});

test('clearRest borra la pausa guardada', async () => {
  await saveRest({ endsAt: 5_000_000, total: 60 });
  await clearRest();
  expect(await loadRest(1)).toBeNull();
});
