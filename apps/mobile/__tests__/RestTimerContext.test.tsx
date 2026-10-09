import React from 'react';
import { Vibration } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { RestTimerProvider, useRestTimer } from '../src/store/RestTimerContext';
import { clearRest, loadRest, saveRest } from '../src/services/restTimerStorage';

jest.mock('../src/services/restTimerStorage', () => ({
  loadRest: jest.fn(),
  saveRest: jest.fn(),
  clearRest: jest.fn(),
}));
jest.mock('../src/components/RestTimer', () => ({ RestModal: () => null }));

const load = loadRest as jest.Mock;
let latest: ReturnType<typeof useRestTimer>;
function Probe() {
  latest = useRestTimer();
  return null;
}
async function mount() {
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(
      <RestTimerProvider>
        <Probe />
      </RestTimerProvider>,
    );
  });
}

beforeEach(() => jest.clearAllMocks());

test('retoma la pausa que seguía corriendo al reabrir la app, minimizada', async () => {
  load.mockResolvedValue({ endsAt: Date.now() + 40_000, total: 90 });
  await mount();
  expect(latest.remaining).toBeGreaterThan(35);
  expect(latest.remaining).toBeLessThanOrEqual(40);
  expect(latest.total).toBe(90);
  expect(latest.expanded).toBe(false);
});

test('sin pausa guardada no hay temporizador', async () => {
  load.mockResolvedValue(null);
  await mount();
  expect(latest.remaining).toBeNull();
});

test('iniciar una pausa la guarda y saltarla la borra', async () => {
  load.mockResolvedValue(null);
  await mount();
  await ReactTestRenderer.act(async () => {
    latest.setRoutineStarted(true);
  });
  await ReactTestRenderer.act(async () => {
    latest.startRest(60);
  });
  const saved = (saveRest as jest.Mock).mock.calls.at(-1)[0];
  expect(saved.total).toBe(60);
  expect(saved.endsAt).toBeGreaterThan(Date.now());
  await ReactTestRenderer.act(async () => {
    latest.skip();
  });
  expect(latest.remaining).toBeNull();
  expect(clearRest).toHaveBeenCalled();
});

test('una pausa restaurada que termina vibra una vez y se borra', async () => {
  const vibrate = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {});
  jest.useFakeTimers();
  load.mockResolvedValue({ endsAt: Date.now() + 1_000, total: 90 });
  await mount();
  await ReactTestRenderer.act(async () => {
    jest.advanceTimersByTime(1_500);
  });
  expect(latest.remaining).toBeNull();
  expect(vibrate).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
  vibrate.mockRestore();
});
