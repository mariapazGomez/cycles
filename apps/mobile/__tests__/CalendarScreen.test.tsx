import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { CalendarScreen } from '../src/screens/CalendarScreen';
import { fetchActiveCycles, fetchCycleSessions } from '../src/services/planApi';
import { scheduleSession } from '../src/services/executionApi';
import { toLocalDay } from '../src/utils/planCalendar';

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
jest.mock('../src/services/executionApi', () => ({ scheduleSession: jest.fn() }));
jest.mock('../src/components/ProfileAvatar', () => ({ ProfileAvatar: () => null }));

const cycles = fetchActiveCycles as jest.Mock;
const sessions = fetchCycleSessions as jest.Mock;
const schedule = scheduleSession as jest.Mock;

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

test('elegir el día de una sesión pendiente llama a la API y actualiza la fila', async () => {
  cycles.mockResolvedValue([cycle]);
  sessions.mockResolvedValue([session('b', 1, 1, 'pending')]);
  const target = new Date(Date.parse(cycle.startDate) + 86400000).toISOString().slice(0, 10);
  schedule.mockResolvedValue({ ...session('b', 1, 1, 'pending'), scheduledDate: `${target}T00:00:00.000Z` });

  const tree = await mount();
  expect(texts(tree)).toContain('Elegir día');

  await ReactTestRenderer.act(async () => {
    tree.root.find(n => n.props.accessibilityLabel === 'Asignar día a Full body b').props.onPress();
  });
  expect(texts(tree)).toContain('¿Qué día harás esta sesión?');

  await ReactTestRenderer.act(async () => {
    await tree.root.find(n => n.props.accessibilityLabel === `Día ${target}`).props.onPress();
  });
  expect(schedule).toHaveBeenCalledWith('b', target);
  expect(texts(tree)).not.toContain('¿Qué día harás esta sesión?');
  expect(texts(tree).some(t => /^(lunes|martes|miércoles|jueves|viernes|sábado|domingo) \d+$/.test(t))).toBe(true);
});

test('una sesión hecha no ofrece cambiar el día, pero sí abrir su detalle', async () => {
  cycles.mockResolvedValue([cycle]);
  sessions.mockResolvedValue([session('a', 1, 1, 'completed')]);
  const tree = await mount();
  expect(tree.root.findAll(n => n.props.accessibilityLabel === 'Asignar día a Full body a')).toHaveLength(0);
  await ReactTestRenderer.act(async () => {
    tree.root.find(n => n.props.accessibilityLabel === 'Ver Full body a').props.onPress();
  });
  expect(mockNavigate).toHaveBeenCalledWith('SessionDetail', { sessionId: 'a' });
});

test('un error al guardar el día se muestra en la hoja', async () => {
  cycles.mockResolvedValue([cycle]);
  sessions.mockResolvedValue([session('b', 1, 1, 'pending')]);
  schedule.mockRejectedValue(new Error('El día debe estar dentro de las fechas del plan.'));
  const tree = await mount();
  await ReactTestRenderer.act(async () => {
    tree.root.find(n => n.props.accessibilityLabel === 'Asignar día a Full body b').props.onPress();
  });
  const today = toLocalDay(new Date());
  await ReactTestRenderer.act(async () => {
    await tree.root.findAll(n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Día '))[1].props.onPress();
  });
  expect(texts(tree)).toContain('El día debe estar dentro de las fechas del plan.');
  expect(today).toBeTruthy();
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
