import React from 'react';
import { AppState, Vibration } from 'react-native';
import notifee from 'react-native-notify-kit';
import ReactTestRenderer from 'react-test-renderer';
import { RestTimerProvider, useRestTimer } from '../src/store/RestTimerContext';
import { clearRest, loadRest, saveRest } from '../src/services/restTimerStorage';
import { hideRestActivity, showRestActivity } from '../src/services/restActivity';

jest.mock('../src/services/restTimerStorage', () => ({
  loadRest: jest.fn(),
  saveRest: jest.fn(),
  clearRest: jest.fn(),
}));
jest.mock('../src/services/restActivity', () => ({ showRestActivity: jest.fn(), hideRestActivity: jest.fn() }));
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

describe('aviso del sistema al minimizar', () => {
  const notifications = notifee as unknown as {
    requestPermission: jest.Mock;
    createTriggerNotification: jest.Mock;
    cancelTriggerNotification: jest.Mock;
  };
  let emit: (state: string) => void;
  beforeEach(() => {
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, cb: (s: string) => void) => {
      emit = cb;
      return { remove: jest.fn() };
    }) as never);
  });
  afterEach(() => jest.restoreAllMocks());

  const startRest = async (seconds: number) => {
    load.mockResolvedValue(null);
    await mount();
    await ReactTestRenderer.act(async () => {
      latest.setRoutineStarted(true);
    });
    await ReactTestRenderer.act(async () => {
      latest.startRest(seconds);
    });
  };

  test('pide el permiso al iniciar el descanso, con la app abierta', async () => {
    await startRest(60);
    expect(notifications.requestPermission).toHaveBeenCalled();
  });

  test('al minimizar agenda la notificación para la hora de fin', async () => {
    await startRest(60);
    const endsAt = (saveRest as jest.Mock).mock.calls.at(-1)[0].endsAt;
    await ReactTestRenderer.act(async () => emit('background'));
    const [content, trigger] = notifications.createTriggerNotification.mock.calls.at(-1);
    expect(content.title).toBe('Descanso terminado');
    expect(trigger.timestamp).toBe(endsAt);
  });

  test('al volver a la app cancela la notificación', async () => {
    await startRest(60);
    await ReactTestRenderer.act(async () => emit('background'));
    await ReactTestRenderer.act(async () => emit('active'));
    expect(notifications.cancelTriggerNotification).toHaveBeenCalledWith('rest-timer-end');
  });

  test('sin descanso en curso, minimizar no agenda nada', async () => {
    load.mockResolvedValue(null);
    await mount();
    await ReactTestRenderer.act(async () => emit('background'));
    expect(notifications.createTriggerNotification).not.toHaveBeenCalled();
  });
});

describe('isla dinámica (Live Activity)', () => {
  const mountWithRest = async (seconds: number) => {
    load.mockResolvedValue(null);
    await mount();
    await ReactTestRenderer.act(async () => {
      latest.setRoutineStarted(true);
    });
    await ReactTestRenderer.act(async () => {
      latest.startRest(seconds);
    });
  };

  test('al iniciar un descanso se muestra con su inicio y su fin', async () => {
    await mountWithRest(60);
    const [startedAt, endsAt] = (showRestActivity as jest.Mock).mock.calls.at(-1);
    expect(endsAt - startedAt).toBe(60_000);
    expect(endsAt).toBeGreaterThan(Date.now());
  });

  test('ajustar el descanso actualiza la actividad con el nuevo fin', async () => {
    await mountWithRest(60);
    const before = (showRestActivity as jest.Mock).mock.calls.at(-1)[1];
    await ReactTestRenderer.act(async () => {
      latest.adjust(15);
    });
    expect((showRestActivity as jest.Mock).mock.calls.at(-1)[1]).toBe(before + 15_000);
  });

  test('saltar el descanso oculta la actividad', async () => {
    await mountWithRest(60);
    await ReactTestRenderer.act(async () => {
      latest.skip();
    });
    expect(hideRestActivity).toHaveBeenCalled();
  });

  test('al abrir sin descanso vigente borra una actividad que quedó en pantalla', async () => {
    load.mockResolvedValue(null);
    await mount();
    expect(hideRestActivity).toHaveBeenCalled();
  });
});

test('sin segundos planificados (0) no hay descanso: no corre ni se guarda', async () => {
  load.mockResolvedValue(null);
  await mount();
  await ReactTestRenderer.act(async () => {
    latest.setRoutineStarted(true);
  });
  (saveRest as jest.Mock).mockClear();
  await ReactTestRenderer.act(async () => {
    latest.startRest(0);
  });
  expect(latest.remaining).toBeNull();
  expect(saveRest).not.toHaveBeenCalled();
});
