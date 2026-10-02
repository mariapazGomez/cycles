import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { CalendarScreen } from '../src/screens/CalendarScreen';
import { fetchActiveCycles, fetchCycleSessions } from '../src/services/planApi';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useNavigation: () => ({ navigate: mockNavigate }),
    useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]),
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../src/services/planApi', () => ({
  fetchActiveCycles: jest.fn(),
  fetchCycleSessions: jest.fn(),
}));
jest.mock('../src/components/ProfileAvatar', () => ({ ProfileAvatar: () => null }));

const cycles = fetchActiveCycles as jest.Mock;
const sessions = fetchCycleSessions as jest.Mock;

const cycle = {
  id: 'c1',
  name: 'Rutina en Casa 1',
  startDate: new Date(Date.now() - 2 * 86400000).toISOString(), // estamos en la semana 1
  endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
};
const session = (id: string, week: number, slot: number, status: string) => ({
  id, cycleId: 'c1', name: `Full body ${id}`, weekNumber: week, slotNumber: slot, status,
});

async function mount() {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<CalendarScreen />);
  });
  return tree;
}
const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAll(n => typeof n.props.children === 'string').map(n => n.props.children as string);

beforeEach(() => jest.clearAllMocks());

test('muestra las sesiones de la semana con su estado y marca la siguiente', async () => {
  cycles.mockResolvedValue([cycle]);
  sessions.mockResolvedValue([
    session('a', 1, 1, 'completed'),
    session('b', 1, 2, 'pending'),
    session('c', 1, 3, 'pending'),
    session('d', 2, 1, 'pending'),
  ]);
  const t = texts(await mount());
  expect(t).toContain('Rutina en Casa 1');
  expect(t).toContain('Semana 1');
  expect(t).toEqual(expect.arrayContaining(['Hecha', 'Siguiente', 'Pendiente']));
  expect(t).not.toContain('Full body d');
});

test('tocar la sesión siguiente lleva a Inicio', async () => {
  cycles.mockResolvedValue([cycle]);
  sessions.mockResolvedValue([session('b', 1, 1, 'pending')]);
  const tree = await mount();
  const next = tree.root.find(n => typeof n.props.onPress === 'function' && n.props.disabled === false);
  await ReactTestRenderer.act(async () => next.props.onPress());
  expect(mockNavigate).toHaveBeenCalledWith('Today');
});

test('sin planes activos muestra el estado vacío', async () => {
  cycles.mockResolvedValue([]);
  const t = texts(await mount());
  expect(t).toContain('Aún no tienes un plan activo');
});

test('si falla la carga muestra el error', async () => {
  cycles.mockRejectedValue(new Error('x'));
  const t = texts(await mount());
  expect(t).toContain('No pudimos cargar tu calendario. Desliza para reintentar.');
});
