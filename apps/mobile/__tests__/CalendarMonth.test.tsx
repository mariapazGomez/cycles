import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { CalendarScreen } from '../src/screens/CalendarScreen';
import { fetchActiveCycles, fetchCycleSessions } from '../src/services/planApi';
import { createEvent, deleteEvent, fetchEvents, updateEvent } from '../src/services/eventsApi';
import { ApiError } from '../src/services/httpClient';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]),
    useNavigation: () => ({ navigate: mockNavigate }),
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../src/services/planApi', () => ({ fetchActiveCycles: jest.fn(), fetchCycleSessions: jest.fn() }));
jest.mock('../src/services/executionApi', () => ({ scheduleSession: jest.fn() }));
jest.mock('../src/services/eventsApi', () => {
  const actual = jest.requireActual('../src/services/eventsApi');
  return { ...actual, fetchEvents: jest.fn(), createEvent: jest.fn(), updateEvent: jest.fn(), deleteEvent: jest.fn() };
});
jest.mock('../src/components/ProfileAvatar', () => ({ ProfileAvatar: () => null }));

const cycles = fetchActiveCycles as jest.Mock;
const sessions = fetchCycleSessions as jest.Mock;
const events = fetchEvents as jest.Mock;
const create = createEvent as jest.Mock;
const update = updateEvent as jest.Mock;
const remove = deleteEvent as jest.Mock;

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const occurrence = (date: string, over = {}) => ({
  seriesId: 'ev1', date, isException: false, type: 'training' as const, sport: 'volleyball' as const, title: 'Voleibol',
  startTime: '19:00', durationMin: 90, allDay: false, intensity: 'medium' as const, notes: null, repeat: null, ...over,
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
const press = async (tree: ReactTestRenderer.ReactTestRenderer, label: string) => {
  await ReactTestRenderer.act(async () => {
    tree.root.find(n => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function').props.onPress();
  });
};
const type = async (tree: ReactTestRenderer.ReactTestRenderer, label: string, value: string) => {
  await ReactTestRenderer.act(async () => {
    tree.root.find(n => n.props.accessibilityLabel === label && typeof n.props.onChangeText === 'function').props.onChangeText(value);
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  cycles.mockResolvedValue([]);
  sessions.mockResolvedValue([]);
  events.mockResolvedValue([]);
});

test('sin ciclo la semana usa el modo Fechas: pide lunes a domingo y no ofrece Ciclo | Fechas', async () => {
  const tree = await mount();
  expect(events).toHaveBeenCalledTimes(1);
  const [from, to] = events.mock.calls[0];
  expect((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000).toBe(6);
  expect(from <= todayIso() && todayIso() <= to).toBe(true);
  expect(texts(tree).some(t => t.startsWith('Semana del '))).toBe(true);
  expect(texts(tree)).toContain('Aún no tienes un ciclo activo');
  expect(tree.root.findAll(n => n.props.accessibilityLabel === 'Fechas' && typeof n.props.onPress === 'function')).toHaveLength(0);
  await press(tree, 'Mes');
  expect(events).toHaveBeenCalledTimes(2);
});

test('el mes funciona sin ciclo ni coach: pide el rango del mes con sus días de relleno', async () => {
  const tree = await mount();
  events.mockClear();
  await press(tree, 'Mes');
  const [from, to] = events.mock.calls[0];
  expect(from <= todayIso() && todayIso() <= to).toBe(true);
  expect((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000 + 1).toBeLessThanOrEqual(42);
  // La tarjeta de «sin ciclo» es de la vista de semana: en el mes no estorba.
  expect(texts(tree)).not.toContain('Aún no tienes un ciclo activo');
  expect(texts(tree).some(t => /^[A-Z][a-z]+ \d{4}$/.test(t))).toBe(true);
});

test('muestra las actividades del día elegido y abre su edición al tocarlas', async () => {
  events.mockResolvedValue([occurrence(todayIso())]);
  const tree = await mount();
  await press(tree, 'Mes');
  expect(texts(tree)).toContain('Voleibol');
  expect(texts(tree)).toContain('19:00 · 90 min, Media');
  await ReactTestRenderer.act(async () => {
    tree.root.find(n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Voleibol: Voleibol') && typeof n.props.onPress === 'function').props.onPress();
  });
  expect(texts(tree)).toContain('Editar actividad');
});

test('agregar una actividad: abre la hoja, valida, guarda y recarga el mes', async () => {
  const tree = await mount();
  await press(tree, 'Mes');
  events.mockClear();
  create.mockResolvedValue({ id: 'nuevo' });
  await press(tree, 'Agregar actividad');
  expect(texts(tree)).toContain('Agregar al calendario');
  await press(tree, 'Guardar');
  expect(create).not.toHaveBeenCalled();
  expect(texts(tree)).toContain('Escribe un nombre.');
  await type(tree, 'Nombre', 'Voleibol');
  await press(tree, 'Guardar');
  expect(create).toHaveBeenCalledTimes(1);
  expect(create.mock.calls[0][0]).toMatchObject({ type: 'training', title: 'Voleibol', date: todayIso() });
  // Tras guardar: la hoja se cierra y se vuelve a pedir el mes.
  expect(events).toHaveBeenCalledTimes(1);
  expect(texts(tree)).not.toContain('Agregar al calendario');
});

test('si guardar falla, la hoja sigue abierta con el mensaje de la API', async () => {
  const tree = await mount();
  await press(tree, 'Mes');
  create.mockRejectedValue(new ApiError(400, 'La fecha de inicio debe caer en uno de los días de la repetición.'));
  await press(tree, 'Agregar actividad');
  await type(tree, 'Nombre', 'Voleibol');
  await press(tree, 'Guardar');
  expect(texts(tree)).toContain('La fecha de inicio debe caer en uno de los días de la repetición.');
  expect(texts(tree)).toContain('Agregar al calendario');
});

test('editar «solo este día» y eliminar una ocurrencia llaman a la API con su alcance', async () => {
  events.mockResolvedValue([occurrence(todayIso(), { repeat: { days: [0, 1, 2, 3, 4, 5, 6], until: null } })]);
  update.mockResolvedValue({});
  remove.mockResolvedValue(undefined);
  const tree = await mount();
  await press(tree, 'Mes');
  const open = async () =>
    ReactTestRenderer.act(async () => {
      tree.root.find(n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Voleibol: Voleibol') && typeof n.props.onPress === 'function').props.onPress();
    });
  await open();
  await press(tree, 'Guardar');
  expect(update).toHaveBeenCalledWith('ev1', expect.objectContaining({ scope: 'occurrence', occurrenceDate: todayIso() }));
  expect(update.mock.calls[0][1]).not.toHaveProperty('date');
  await open();
  await press(tree, 'Eliminar');
  expect(remove).toHaveBeenCalledWith('ev1', 'occurrence', todayIso());
});

test('si las actividades no cargan, avisa aparte y permite reintentar sin esconder el calendario', async () => {
  events.mockRejectedValue(new Error('sin red'));
  const tree = await mount();
  await press(tree, 'Mes');
  expect(texts(tree)).toContain('No pudimos cargar tus actividades. Tus sesiones sí están al día.');
  events.mockResolvedValue([occurrence(todayIso())]);
  await press(tree, 'Reintentar');
  expect(texts(tree)).not.toContain('No pudimos cargar tus actividades. Tus sesiones sí están al día.');
  expect(texts(tree)).toContain('Voleibol');
});

test('las flechas cambian de mes y «Ir a hoy» vuelve', async () => {
  const tree = await mount();
  await press(tree, 'Mes');
  events.mockClear();
  const title = () => texts(tree).find(t => /^[A-Z][a-z]+ \d{4}$/.test(t));
  const first = title();
  await press(tree, 'Mes siguiente');
  expect(title()).not.toBe(first);
  expect(events).toHaveBeenCalledTimes(1);
  await press(tree, 'Ir a hoy');
  expect(title()).toBe(first);
});


describe('semana con actividades', () => {
  const session = (id: string, day: string) => ({ id, cycleId: 'c1', name: `Sesión ${id}`, weekNumber: 1, slotNumber: 1, status: 'pending', scheduledDate: `${day}T00:00:00.000Z` });
  const cycle = {
    id: 'c1', name: 'Rutina en Casa 1',
    startDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
  };

  test('modo Fechas: lista por día las actividades y las sesiones del coach, y deja agregar si no hay nada', async () => {
    events.mockResolvedValue([occurrence(todayIso())]);
    cycles.mockResolvedValue([cycle]);
    sessions.mockResolvedValue([session('a', todayIso())]);
    const tree = await mount();
    await press(tree, 'Fechas');
    const t = texts(tree);
    expect(t.some(x => x.startsWith('Semana del '))).toBe(true);
    expect(t.some(x => x.startsWith('Hoy, '))).toBe(true);
    expect(t).toContain('Voleibol');
    expect(t).toContain('Sesión a');
  });

  test('modo Ciclo: debajo de las sesiones, «Tus actividades esta semana»; sin actividades no aparece', async () => {
    cycles.mockResolvedValue([cycle]);
    sessions.mockResolvedValue([session('a', todayIso())]);
    expect(texts(await mount())).not.toContain('Tus actividades esta semana');
    events.mockResolvedValue([occurrence(todayIso())]);
    const t = texts(await mount());
    expect(t).toContain('Tus actividades esta semana');
    expect(t).toContain('Voleibol');
  });

  test('en Fechas las flechas cambian de semana y «Ir a hoy» vuelve, pidiendo cada rango', async () => {
    cycles.mockResolvedValue([cycle]);
    sessions.mockResolvedValue([]);
    const tree = await mount();
    await press(tree, 'Fechas');
    events.mockClear();
    await press(tree, 'Semana siguiente');
    const [from] = events.mock.calls[0];
    expect(from > todayIso()).toBe(true);
    await press(tree, 'Ir a hoy');
    expect(events.mock.calls[1][0] <= todayIso()).toBe(true);
  });

  test('una semana sin nada lo dice y ofrece agregar una actividad', async () => {
    const tree = await mount();
    expect(texts(tree)).toContain('Esta semana no tienes nada');
    await press(tree, 'Agregar actividad esta semana');
    expect(texts(tree)).toContain('Agregar al calendario');
  });
});
