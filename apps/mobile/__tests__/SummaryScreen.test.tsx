import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { SummaryScreen } from '../src/screens/SummaryScreen';
import { fetchActiveCycles, fetchCycleSessions, fetchExerciseProgress, fetchMuscleSummary } from '../src/services/planApi';
import { BodyMap } from '../src/components/BodyMap';
import { MuscleStackChart } from '../src/components/MuscleStackChart';
import { barsByDay } from '../src/utils/muscleSummary';

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return { useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]) };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../src/services/planApi', () => ({
  fetchActiveCycles: jest.fn(),
  fetchCycleSessions: jest.fn(),
  fetchMuscleSummary: jest.fn(),
  fetchExerciseProgress: jest.fn(),
}));
jest.mock('../src/components/ProfileAvatar', () => ({ ProfileAvatar: () => null }));

const cycles = fetchActiveCycles as jest.Mock;
const sessions = fetchCycleSessions as jest.Mock;
const summary = fetchMuscleSummary as jest.Mock;
const progress = fetchExerciseProgress as jest.Mock;

const zero = { legs: 0, back: 0, chest: 0, shoulders: 0, glutes: 0, arms: 0, core: 0 };
const cycle = {
  id: 'c1', name: 'Rutina en Casa 1',
  startDate: new Date(Date.now() - 2 * 86400000).toISOString(),
  endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
};
const session = (id: string, week: number, slot: number, status: string) => ({
  id, cycleId: 'c1', name: `S${id}`, weekNumber: week, slotNumber: slot, status,
});
const trained = (id: string, week: number, at: string, sets: Partial<typeof zero>, kg: Partial<typeof zero>) => ({
  sessionId: id, name: id, weekNumber: week, trainedAt: at, sets: { ...zero, ...sets }, kg: { ...zero, ...kg },
});

async function mount() {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<SummaryScreen />);
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

beforeEach(() => {
  jest.clearAllMocks();
  progress.mockResolvedValue([]);
});

// Los gráficos de músculos van plegados (CYC-241): se abren con un toque.
const openMuscles = (tree: ReactTestRenderer.ReactTestRenderer) => press(tree, 'Qué músculos trabajas');

const day = (week: number, weight: number | null, reps: number, plannedWeight: number | null = weight) => ({
  sessionId: `s${week}`, weekNumber: week, date: new Date(2026, 9, week).toISOString(),
  plannedSets: 3, plannedReps: 6, plannedWeight, plannedRir: 2, actualWeight: weight, actualReps: reps,
  series: [],
});
const exercise = (id: string, name: string, sessions: ReturnType<typeof day>[]) => ({ exerciseId: id, name, muscleGroup: null, sessions });
const oneDay = () => {
  cycles.mockResolvedValue([cycle]);
  sessions.mockResolvedValue([session('a', 1, 1, 'completed')]);
  summary.mockResolvedValue({ cycleId: 'c1', days: [trained('a', 1, new Date().toISOString(), { legs: 6 }, { legs: 3000 })] });
};

test('muestra la constancia: sesiones hechas, total y semanas seguidas', async () => {
  cycles.mockResolvedValue([cycle]);
  sessions.mockResolvedValue([session('a', 1, 1, 'completed'), session('b', 1, 2, 'completed'), session('c', 1, 3, 'pending'), session('d', 2, 1, 'pending')]);
  summary.mockResolvedValue({ cycleId: 'c1', days: [] });
  const t = texts(await mount());
  expect(t).toContain('Rutina en Casa 1');
  expect(t).toContain('2');
  expect(t).toContain('de 4 sesiones hechas');
  expect(t).toContain('1 semana seguida');
  expect(t).toContain('Tu progreso empieza con la primera sesión');
});

test('arranca en series y permite cambiar a carga en kilos', async () => {
  cycles.mockResolvedValue([cycle]);
  sessions.mockResolvedValue([session('a', 1, 1, 'completed')]);
  summary.mockResolvedValue({
    cycleId: 'c1',
    days: [trained('a', 1, new Date().toISOString(), { legs: 6, core: 2 }, { legs: 3000, core: 0 })],
  });
  const tree = await mount();
  await openMuscles(tree);
  expect(texts(tree)).toContain(' series');
  expect(texts(tree)).toContain('En qué grupos entrenas');
  expect(texts(tree)).toContain('Foco del ciclo');
  expect(texts(tree)).not.toContain(' kg');
  await press(tree, 'Carga (kg)');
  expect(texts(tree)).toContain(' kg');
});

test('permite ver el detalle por semana', async () => {
  cycles.mockResolvedValue([cycle]);
  sessions.mockResolvedValue([session('a', 1, 1, 'completed'), session('b', 2, 1, 'completed')]);
  summary.mockResolvedValue({
    cycleId: 'c1',
    days: [
      trained('a', 1, new Date(Date.now() - 86400000).toISOString(), { legs: 4 }, {}),
      trained('b', 2, new Date().toISOString(), { back: 5 }, {}),
    ],
  });
  const tree = await mount();
  await openMuscles(tree);
  await press(tree, 'Por semana');
  expect(texts(tree)).toContain('Semana 2');
});

test('sin planes activos muestra el estado vacío', async () => {
  cycles.mockResolvedValue([]);
  expect(texts(await mount())).toContain('Aún no tienes un ciclo activo');
});

test('si falla la carga muestra el error', async () => {
  cycles.mockRejectedValue(new Error('x'));
  expect(texts(await mount())).toContain('No pudimos cargar tu resumen. Desliza para reintentar.');
});

test('el mapa pinta oscuro el grupo con más carga y gris los que no tienen', () => {
  const onSelect = jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<BodyMap totals={[10, 0, 0, 0, 0, 0, 0]} selected="legs" onSelect={onSelect} />);
  });
  const parts = tree.root.findAll(n => typeof n.props.onPress === 'function' && typeof n.props.fill === 'string');
  expect(parts.some(n => n.props.fill === '#0d2f78')).toBe(true);
  expect(parts.some(n => n.props.fill === '#dfe4ec')).toBe(true);
  const gray = parts.find(n => n.props.fill === '#dfe4ec')!;
  ReactTestRenderer.act(() => gray.props.onPress());
  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onSelect.mock.calls[0][0]).not.toBe('legs');
});

test('tocar una barra del gráfico la selecciona', () => {
  const onSelect = jest.fn();
  const bars = barsByDay(
    [
      trained('a', 1, '2026-10-05T15:00:00.000Z', { legs: 3 }, {}),
      trained('b', 1, '2026-10-07T15:00:00.000Z', { back: 4 }, {}),
    ],
    'sets',
  );
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<MuscleStackChart bars={bars} selected={1} onSelect={onSelect} width={300} />);
  });
  const groups = tree.root.findAll(n => typeof n.props.onPress === 'function');
  expect(groups.length).toBe(2);
  ReactTestRenderer.act(() => groups[0].props.onPress());
  expect(onSelect).toHaveBeenCalledWith(0);
});


test('«Cómo van tus ejercicios»: peso y repeticiones de la primera a la última sesión, sin color de juicio', async () => {
  oneDay();
  progress.mockResolvedValue([exercise('e1', 'Sentadilla', [day(1, 60, 6), day(2, 65, 6), day(3, 70, 5)])]);
  const t = texts(await mount());
  expect(t).toContain('Cómo van tus ejercicios');
  expect(t).toContain('Sentadilla');
  expect(t).toContain('60 → 70 kg');
  expect(t).toContain('▲ +10 kg');
  expect(t).toContain('6 → 5 reps');
  expect(t).toContain('▼ −1');
});

test('los ejercicios que más cambiaron van primero', async () => {
  oneDay();
  progress.mockResolvedValue([
    exercise('e1', 'Press de banca', [day(1, 40, 8), day(2, 40, 8)]),
    exercise('e2', 'Peso muerto', [day(1, 80, 5), day(2, 100, 5)]),
  ]);
  const t = texts(await mount());
  expect(t.indexOf('Peso muerto')).toBeLessThan(t.indexOf('Press de banca'));
});

test('sin ejercicios repetidos explica qué se verá', async () => {
  oneDay();
  const t = texts(await mount());
  expect(t).toContain('Cuando repitas un ejercicio, lo verás aquí');
  expect(t).toContain('Verás cómo cambian tu peso y tus repeticiones de una sesión a otra.');
});

test('un ejercicio de peso corporal muestra solo repeticiones', async () => {
  oneDay();
  progress.mockResolvedValue([exercise('e3', 'Dominadas', [day(1, null, 6), day(2, null, 8)])]);
  const t = texts(await mount());
  expect(t).toContain('Peso corporal');
  expect(t).toContain('6 → 8 reps');
  expect(t).toContain('▲ +2');
});

test('si el historial no carga, avisa y el resto del Resumen sigue', async () => {
  oneDay();
  progress.mockRejectedValue(new Error('x'));
  const t = texts(await mount());
  expect(t).toContain('No pudimos cargar tus ejercicios. Desliza para reintentar.');
  expect(t).toContain('Qué músculos trabajas');
});

test('tocar la tarjeta abre el gráfico de cada sesión', async () => {
  oneDay();
  progress.mockResolvedValue([exercise('e1', 'Sentadilla', [day(1, 60, 6), day(2, 62.5, 6)])]);
  const tree = await mount();
  expect(texts(tree)).not.toContain('Peso por sesión');
  await ReactTestRenderer.act(async () => {
    tree.root.find(n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Sentadilla.') && typeof n.props.onPress === 'function').props.onPress();
  });
  expect(texts(tree)).toContain('Peso por sesión');
  expect(texts(tree)).toContain('Repeticiones por sesión');
});

test('los músculos arrancan plegados y se abren con un toque', async () => {
  oneDay();
  const tree = await mount();
  expect(texts(tree)).not.toContain('Foco del ciclo');
  await openMuscles(tree);
  expect(texts(tree)).toContain('Foco del ciclo');
});
