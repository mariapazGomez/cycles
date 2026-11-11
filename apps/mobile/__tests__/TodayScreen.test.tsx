import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { TodayScreen } from '../src/screens/TodayScreen';
import { fetchToday, fetchWeeklySummary } from '../src/services/executionApi';
import { fetchCycles } from '../src/services/planApi';
import { fetchNotifications, markNotificationRead } from '../src/services/notificationsApi';
import { fetchEvents } from '../src/services/eventsApi';
import { toLocalDay } from '../src/utils/planCalendar';
import { ApiError } from '../src/services/httpClient';

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return { useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]) };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../src/services/tokenStore', () => ({ tokenStore: { getAccessToken: jest.fn(), getRefreshToken: jest.fn() } }));
jest.mock('../src/services/executionApi', () => ({ fetchToday: jest.fn(), startSession: jest.fn(), fetchWeeklySummary: jest.fn() }));
jest.mock('../src/services/planApi', () => ({ fetchCycles: jest.fn() }));
jest.mock('../src/services/notificationsApi', () => ({ fetchNotifications: jest.fn(), markNotificationRead: jest.fn() }));
jest.mock('../src/services/eventsApi', () => ({ fetchEvents: jest.fn() }));
jest.mock('../src/store/RestTimerContext', () => ({
  DEFAULT_REST_SECONDS: 90,
  useRestTimer: () => ({ routineStarted: false, setRoutineStarted: jest.fn(), autoRest: true, setAutoRest: jest.fn() }),
}));
jest.mock('../src/components/RestTimer', () => ({ RestBar: () => null }));
jest.mock('../src/components/ProfileAvatar', () => ({ ProfileAvatar: () => null }));
let mockUser: { email: string; hasActiveCoach?: boolean } = { email: 'v@example.com', hasActiveCoach: true };
jest.mock('../src/store/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));

const fetchTodayMock = fetchToday as jest.Mock;
const weeklyMock = fetchWeeklySummary as jest.Mock;
const { weeklySummaryFixture } = require('../../../packages/shared/src/fixtures/weeklySummary');
const fetchCyclesMock = fetchCycles as jest.Mock;
const notificationsMock = fetchNotifications as jest.Mock;
const markReadMock = markNotificationRead as jest.Mock;
const eventsMock = fetchEvents as jest.Mock;
const navigateMock = jest.fn();

const session = (id: string, name: string, slot: number) => ({
  id, cycleId: 'c1', name, weekNumber: 1, slotNumber: slot, status: 'pending', startedAt: null, sessionExercises: [],
});
const payload = (current: ReturnType<typeof session>, assigned: ReturnType<typeof session>[]) => ({
  cycle: { id: 'c1', name: 'Plan', currentWeek: 1 },
  session: current,
  assignedToday: assigned.map(a => ({ id: a.id, name: a.name, cycleId: 'c1', weekNumber: 1, slotNumber: a.slotNumber })),
});

async function mount() {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <TodayScreen {...(({ navigation: { navigate: navigateMock }, route: {} } as unknown) as React.ComponentProps<typeof TodayScreen>)} />,
    );
  });
  return tree;
}
const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAll(n => typeof n.props.children === 'string').map(n => n.props.children as string);

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { email: 'v@example.com', hasActiveCoach: true };
  weeklyMock.mockReset();
  weeklyMock.mockRejectedValue(new Error('sin red'));
  notificationsMock.mockResolvedValue([]);
  eventsMock.mockResolvedValue([]);
  markReadMock.mockResolvedValue(undefined);
});

test('pide Hoy con el día local del atleta', async () => {
  fetchTodayMock.mockResolvedValue(payload(session('a', 'Full body, día 1', 1), []));
  await mount();
  expect(fetchTodayMock.mock.calls[0][0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(fetchTodayMock.mock.calls[0][0].sessionId).toBeUndefined();
});

test('muestra otra sesión asignada para hoy y permite hacerla', async () => {
  const first = session('a', 'Full body, día 1', 1);
  const other = session('b', 'Full body, día 2', 2);
  fetchTodayMock.mockResolvedValueOnce(payload(first, [other]));
  fetchTodayMock.mockResolvedValueOnce(payload(other, [other]));
  const tree = await mount();
  expect(texts(tree)).toContain('Asignadas para hoy');
  expect(texts(tree)).not.toContain('Asignada para hoy');

  await ReactTestRenderer.act(async () => {
    tree.root.find(n => n.props.accessibilityLabel === 'Hacer Full body, día 2').props.onPress();
  });
  expect(fetchTodayMock.mock.calls[1][0].sessionId).toBe('b');
  expect(texts(tree)).toContain('Asignada para hoy');
  expect(texts(tree)).toContain('Volver a la siguiente sesión del ciclo');
});

test('si la sesión elegida ya no está pendiente, vuelve a la siguiente del plan', async () => {
  const first = session('a', 'Full body, día 1', 1);
  const other = session('b', 'Full body, día 2', 2);
  fetchTodayMock.mockResolvedValueOnce(payload(first, [other]));
  fetchTodayMock.mockRejectedValueOnce(new ApiError(404, 'no pendiente'));
  fetchTodayMock.mockResolvedValueOnce(payload(first, [other]));
  const tree = await mount();
  await ReactTestRenderer.act(async () => {
    tree.root.find(n => n.props.accessibilityLabel === 'Hacer Full body, día 2').props.onPress();
  });
  expect(fetchTodayMock.mock.calls[2][0].sessionId).toBeUndefined();
  expect(texts(tree)).toContain('Full body, día 1');
});

test('si se registró sola y ningún coach la vinculó, pide que su coach la invite con su correo', async () => {
  mockUser = { email: 'v@example.com', hasActiveCoach: false };
  fetchTodayMock.mockResolvedValue(null);
  const tree = await mount();
  expect(texts(tree)).toContain('Falta tu coach');
  expect(texts(tree).some(t => t.includes('v@example.com'))).toBe(true);
});

test('con coach y sin ningún ciclo, dice que su coach está preparando el ciclo (CYC-245)', async () => {
  fetchTodayMock.mockResolvedValue(null);
  fetchCyclesMock.mockResolvedValue([]);
  const tree = await mount();
  expect(texts(tree)).toContain('Tu coach está preparando tu ciclo');
  expect(texts(tree)).toContain('Cuando te asigne tu primera sesión, la verás aquí.');
  expect(fetchCyclesMock).toHaveBeenCalledTimes(1);
});

test('con ciclo y sin sesión pendiente, dice «Hoy no tienes sesión» y «Descansa.»', async () => {
  fetchTodayMock.mockResolvedValue(null);
  fetchCyclesMock.mockResolvedValue([{ id: 'c1' }]);
  const tree = await mount();
  expect(texts(tree)).toContain('Hoy no tienes sesión');
  expect(texts(tree)).toContain('Descansa.');
  expect(texts(tree)).not.toContain('Tu coach está preparando tu ciclo');
});

test('si no se pueden leer los ciclos, cae en «Hoy no tienes sesión» sin romper la pantalla', async () => {
  fetchTodayMock.mockResolvedValue(null);
  fetchCyclesMock.mockRejectedValue(new Error('sin red'));
  const tree = await mount();
  expect(texts(tree)).toContain('Hoy no tienes sesión');
});

test('sin coach no se consultan los ciclos', async () => {
  mockUser = { email: 'v@example.com', hasActiveCoach: false };
  fetchTodayMock.mockResolvedValue(null);
  await mount();
  expect(fetchCyclesMock).not.toHaveBeenCalled();
});


const notif = (id: string, type: string, over: Record<string, unknown> = {}) => ({
  id, type, planId: 'p1', sessionId: 's1', count: 1, payload: { routineName: 'Torso B', planName: 'Ciclo 1' },
  read: false, createdAt: '2026-11-08T10:00:00.000Z', at: '2026-11-08T10:00:00.000Z', ...over,
});
const occurrence = (title: string, over: Record<string, unknown> = {}) => ({
  seriesId: title, date: toLocalDay(new Date()), isException: false, type: 'training', sport: 'volleyball', title,
  startTime: '19:00', durationMin: 90, allDay: false, intensity: 'medium', notes: null, repeat: null, ...over,
});
const tapLabel = async (tree: ReactTestRenderer.ReactTestRenderer, startsWith: string) => {
  await ReactTestRenderer.act(async () => {
    tree.root.find(n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith(startsWith) && typeof n.props.onPress === 'function').props.onPress();
  });
};

test('aviso «Tu coach agregó una rutina» con el nombre de la rutina; sin avisos nuevos no aparece', async () => {
  fetchTodayMock.mockResolvedValue(payload(session('a', 'Full body, día 1', 1), []));
  const none = texts(await mount());
  expect(none).not.toContain('Tu coach agregó una rutina');
  notificationsMock.mockResolvedValue([notif('n1', 'session_added')]);
  const t = texts(await mount());
  expect(t).toContain('Tu coach agregó una rutina');
  expect(t).toContain('Torso B');
});

test('con varias novedades dice cuántas rutinas, cuenta los ajustes agrupados y no cuenta los leídos ni otros tipos', async () => {
  fetchTodayMock.mockResolvedValue(payload(session('a', 'Full body, día 1', 1), []));
  notificationsMock.mockResolvedValue([
    notif('n1', 'session_added'),
    notif('n2', 'session_added', { count: 2 }),
    notif('n3', 'session_added', { read: true }),
    notif('n4', 'session_changed'),
    notif('n5', 'session_logged'),
  ]);
  const t = texts(await mount());
  expect(t).toContain('Tu coach agregó 3 rutinas');
  expect(t).toContain('Revisa lo nuevo en tu calendario.');
});

test('abrir el aviso lo marca como leído, lo oculta y lleva a la sesión', async () => {
  fetchTodayMock.mockResolvedValue(payload(session('a', 'Full body, día 1', 1), []));
  notificationsMock.mockResolvedValue([notif('n1', 'session_added')]);
  const tree = await mount();
  await tapLabel(tree, 'Tu coach agregó una rutina');
  expect(markReadMock).toHaveBeenCalledWith('n1');
  expect(navigateMock).toHaveBeenCalledWith('SessionDetail', { sessionId: 's1' });
  expect(texts(tree)).not.toContain('Tu coach agregó una rutina');
});

test('con varias novedades, abrir el aviso lleva al calendario y marca todas', async () => {
  fetchTodayMock.mockResolvedValue(payload(session('a', 'Full body, día 1', 1), []));
  notificationsMock.mockResolvedValue([notif('n1', 'session_added'), notif('n2', 'plan_assigned')]);
  const tree = await mount();
  await tapLabel(tree, 'Tu coach agregó 2 rutinas');
  expect(markReadMock.mock.calls.map(c => c[0]).sort()).toEqual(['n1', 'n2']);
  expect(navigateMock).toHaveBeenCalledWith('Calendar');
});

test('sin «Adelantar»: Hoy no ofrece mover ni repetir una sesión', async () => {
  fetchTodayMock.mockResolvedValue(null);
  fetchCyclesMock.mockResolvedValue([{ id: 'c1' }]);
  const t = texts(await mount());
  expect(t.some(x => x.startsWith('Adelantar'))).toBe(false);
});

test('fila «Hoy también»: una actividad, varias, y sin actividades no aparece', async () => {
  fetchTodayMock.mockResolvedValue(payload(session('a', 'Full body, día 1', 1), []));
  expect(texts(await mount()).some(x => x.startsWith('Hoy también'))).toBe(false);
  eventsMock.mockResolvedValue([occurrence('Voleibol')]);
  expect(texts(await mount())).toContain('Hoy también: voleibol, 19:00');
  eventsMock.mockResolvedValue([occurrence('Voleibol'), occurrence('Gimnasio', { startTime: '08:00' })]);
  expect(texts(await mount())).toContain('Hoy también: gimnasio y 1 más');
});

test('tocar «Hoy también» abre el calendario', async () => {
  fetchTodayMock.mockResolvedValue(payload(session('a', 'Full body, día 1', 1), []));
  eventsMock.mockResolvedValue([occurrence('Voleibol')]);
  const tree = await mount();
  await tapLabel(tree, 'Hoy también');
  expect(navigateMock).toHaveBeenCalledWith('Calendar');
});

test('también aparece cuando hoy no hay sesión', async () => {
  fetchTodayMock.mockResolvedValue(null);
  fetchCyclesMock.mockResolvedValue([{ id: 'c1' }]);
  eventsMock.mockResolvedValue([occurrence('Voleibol')]);
  notificationsMock.mockResolvedValue([notif('n1', 'session_added')]);
  const t = texts(await mount());
  expect(t).toContain('Hoy no tienes sesión');
  expect(t).toContain('Hoy también: voleibol, 19:00');
  expect(t).toContain('Tu coach agregó una rutina');
});

test('si fallan los avisos o las actividades, Hoy se ve igual, sin esos extras', async () => {
  fetchTodayMock.mockResolvedValue(payload(session('a', 'Full body, día 1', 1), []));
  notificationsMock.mockRejectedValue(new Error('sin red'));
  eventsMock.mockRejectedValue(new Error('sin red'));
  const t = texts(await mount());
  expect(t).toContain('Full body, día 1');
  expect(t).not.toContain('Tu coach agregó una rutina');
  expect(t.some(x => x.startsWith('Hoy también'))).toBe(false);
});

describe('sesión con bloques de trabajo (CYC-272)', () => {
  const ex = (id: string, name: string, orderIndex: number, blockId: string | null, targetSets = 3, logged = 0) => ({
    id, sessionId: 'a', exerciseId: id, orderIndex, targetSets, targetReps: 8, blockId, note: null,
    exercise: { id, name, equipment: [], isActive: true },
    logs: Array.from({ length: logged }, (_, i) => ({ id: `${id}-${i}`, setNumber: i + 1, actualReps: 8, actualWeight: null, rir: null })),
  });
  const block = (id: string, name: string, orderIndex: number, type: string) => ({ id, sessionId: 'a', name, type, color: null, orderIndex, note: null });
  const withBlocks = () => ({
    ...payload(session('a', 'Torso B', 1), []),
    session: {
      ...session('a', 'Torso B', 1),
      blocks: [block('b1', 'Calentamiento', 1, 'warmup'), block('b2', 'Fuerza', 2, 'strength')],
      sessionExercises: [
        ex('e1', 'Movilidad de hombro', 1, 'b1', 2, 2),
        ex('e2', 'Press de banca', 2, 'b2', 3, 1),
        ex('e3', 'Remo', 3, 'b2', 3, 0),
      ],
    },
  });

  test('agrupa por bloques: el que sigue se abre solo y el hecho se pliega con «Hecho»', async () => {
    fetchTodayMock.mockResolvedValue(withBlocks());
    const t = texts(await mount());
    expect(t).toContain('Calentamiento');
    expect(t).toContain('Fuerza');
    expect(t).toContain('Hecho');
    expect(t).toContain('0 de 2');
    // El bloque hecho está plegado; el de fuerza, abierto.
    expect(t).not.toContain('Movilidad de hombro');
    expect(t).toContain('Press de banca');
    expect(t).toContain('Remo');
  });

  test('tocar el encabezado abre un bloque plegado', async () => {
    fetchTodayMock.mockResolvedValue(withBlocks());
    const tree = await mount();
    await ReactTestRenderer.act(async () => {
      tree.root.find(n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Calentamiento,') && typeof n.props.onPress === 'function').props.onPress();
    });
    expect(texts(tree)).toContain('Movilidad de hombro');
  });

  test('sin bloques la sesión se ve como siempre (lista plana, sin encabezados)', async () => {
    const flat = withBlocks();
    (flat.session as { blocks?: unknown }).blocks = [];
    fetchTodayMock.mockResolvedValue(flat);
    const t = texts(await mount());
    expect(t).toContain('Movilidad de hombro');
    expect(t).not.toContain('Calentamiento');
  });

  test('si algo falla con los bloques (ejercicios todos sueltos), tampoco se rompe', async () => {
    const loose = withBlocks();
    loose.session.sessionExercises = loose.session.sessionExercises.map(e => ({ ...e, blockId: null }));
    fetchTodayMock.mockResolvedValue(loose);
    const t = texts(await mount());
    expect(t).toContain('Remo');
    expect(t).not.toContain('Fuerza');
  });
});

describe('tarjeta «Esta semana» (CYC-256)', () => {
  test('va primero en Hoy, antes de la sesión, y pide el resumen con el día local', async () => {
    weeklyMock.mockResolvedValue(weeklySummaryFixture);
    fetchTodayMock.mockResolvedValue(payload(session('a', 'Full body, día 1', 1), []));
    const tree = await mount();
    const all = texts(tree);
    expect(all).toEqual(expect.arrayContaining(['Esta semana', '9 al 15 nov', '2 de 3']));
    expect(all.indexOf('Esta semana')).toBeLessThan(all.indexOf('Full body, día 1'));
    expect(weeklyMock.mock.calls[0][0]).toBe(toLocalDay(new Date()));
  });

  test('si el resumen falla, Hoy se ve como siempre, sin tarjeta', async () => {
    fetchTodayMock.mockResolvedValue(payload(session('a', 'Full body, día 1', 1), []));
    const tree = await mount();
    expect(texts(tree)).toContain('Full body, día 1');
    expect(texts(tree)).not.toContain('Esta semana');
  });

  test('con «Hoy no tienes sesión» la tarjeta sigue arriba, sin botón Adelantar', async () => {
    weeklyMock.mockResolvedValue(weeklySummaryFixture);
    fetchTodayMock.mockResolvedValue(null);
    fetchCyclesMock.mockResolvedValue([{ id: 'c1' }]);
    const tree = await mount();
    const all = texts(tree);
    expect(all).toContain('Esta semana');
    expect(all).toContain('Hoy no tienes sesión');
    expect(all.some(t => t.includes('Adelantar'))).toBe(false);
  });
});
