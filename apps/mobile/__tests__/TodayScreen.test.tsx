import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { TodayScreen } from '../src/screens/TodayScreen';
import { fetchToday } from '../src/services/executionApi';
import { ApiError } from '../src/services/httpClient';

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return { useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]) };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../src/services/tokenStore', () => ({ tokenStore: { getAccessToken: jest.fn(), getRefreshToken: jest.fn() } }));
jest.mock('../src/services/executionApi', () => ({ fetchToday: jest.fn(), startSession: jest.fn() }));
jest.mock('../src/store/RestTimerContext', () => ({
  DEFAULT_REST_SECONDS: 90,
  useRestTimer: () => ({ routineStarted: false, setRoutineStarted: jest.fn(), autoRest: true, setAutoRest: jest.fn() }),
}));
jest.mock('../src/components/RestTimer', () => ({ RestBar: () => null }));
jest.mock('../src/components/ProfileAvatar', () => ({ ProfileAvatar: () => null }));

const fetchTodayMock = fetchToday as jest.Mock;

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
      <TodayScreen {...(({ navigation: { navigate: jest.fn() }, route: {} } as unknown) as React.ComponentProps<typeof TodayScreen>)} />,
    );
  });
  return tree;
}
const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAll(n => typeof n.props.children === 'string').map(n => n.props.children as string);

beforeEach(() => jest.clearAllMocks());

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
  expect(texts(tree)).toContain('Volver a la siguiente sesión del plan');
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
