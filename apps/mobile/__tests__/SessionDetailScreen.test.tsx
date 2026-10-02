import React from 'react';
import { Alert } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { SessionDetailScreen } from '../src/screens/SessionDetailScreen';
import { fetchSessionDetail } from '../src/services/planApi';
import { reopenSession, submitFeedback } from '../src/services/executionApi';

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return { useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]) };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../src/services/planApi', () => ({ fetchSessionDetail: jest.fn() }));
jest.mock('../src/services/executionApi', () => ({ reopenSession: jest.fn(), submitFeedback: jest.fn() }));

const detailMock = fetchSessionDetail as jest.Mock;
const reopenMock = reopenSession as jest.Mock;
const feedbackMock = submitFeedback as jest.Mock;

const exercises = [
  {
    id: 'se1', targetSets: 3, targetReps: 8, targetWeight: 60, exercise: { name: 'Sentadilla con barra' },
    logs: [
      { id: 'l1', setNumber: 1, actualReps: 8, actualWeight: 60 },
      { id: 'l2', setNumber: 2, actualReps: 8, actualWeight: 60 },
    ],
  },
  { id: 'se2', targetSets: 2, targetReps: 15, exercise: { name: 'Flexiones de brazos' }, logs: [] },
];
const detail = (status: string, feedback: unknown[] = []) => ({
  id: 's1', name: 'Full body, día 1', weekNumber: 1, slotNumber: 1, status,
  scheduledDate: '2026-10-05T00:00:00.000Z', sessionExercises: exercises, feedback,
});

async function mount() {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SessionDetailScreen {...(({ route: { params: { sessionId: 's1' } }, navigation: {} } as unknown) as React.ComponentProps<typeof SessionDetailScreen>)} />,
    );
  });
  return tree;
}
const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAll(n => typeof n.props.children === 'string').map(n => n.props.children as string);
const press = async (tree: ReactTestRenderer.ReactTestRenderer, label: string) => {
  await ReactTestRenderer.act(async () => {
    await tree.root.find(n => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function').props.onPress();
  });
};
const pressText = async (tree: ReactTestRenderer.ReactTestRenderer, text: string) => {
  const node = tree.root.find(
    n => typeof n.props.onPress === 'function' && n.findAll(c => c.props.children === text).length > 0,
  );
  await ReactTestRenderer.act(async () => {
    await node.props.onPress();
  });
};

beforeEach(() => jest.clearAllMocks());

test('permite revisar la rutina: ejercicios, metas y series registradas', async () => {
  detailMock.mockResolvedValue(detail('pending'));
  const t = texts(await mount());
  expect(t).toEqual(expect.arrayContaining(['Full body, día 1', 'Sentadilla con barra', 'Flexiones de brazos', 'Pendiente']));
  expect(t).toContain('3 × 8 · 60 kg');
  expect(t).toContain('2/3');
  expect(t).toContain('8 × 60 kg');
  expect(t).toContain('Sin series registradas');
});

test('marcar como hecha pide el esfuerzo y envía el cierre', async () => {
  detailMock.mockResolvedValue(detail('pending'));
  feedbackMock.mockResolvedValue({});
  const tree = await mount();
  await press(tree, 'Cambiar estado');
  await pressText(tree, 'Hecha');

  await pressText(tree, 'Guardar como hecha');
  expect(feedbackMock).not.toHaveBeenCalled();
  expect(texts(tree)).toContain('Indica qué tan dura fue la sesión.');

  await press(tree, 'Esfuerzo 7');
  await press(tree, 'Más minutos');
  await pressText(tree, 'Guardar como hecha');
  expect(feedbackMock).toHaveBeenCalledWith('s1', {
    outcome: 'completed', srpe: 7, durationMinutes: 50, notes: undefined, supersedesId: undefined,
  });
  expect(detailMock).toHaveBeenCalledTimes(2);
});

test('pasar de no hecha a hecha corrige el cierre vigente', async () => {
  detailMock.mockResolvedValue(detail('skipped', [{ id: 'fb1', outcome: 'skipped', notes: 'Motivo: Cansancio.', pain: false }]));
  feedbackMock.mockResolvedValue({});
  const tree = await mount();
  expect(texts(tree)).toContain('No hecha');
  expect(texts(tree)).toContain('Motivo: Cansancio.');
  await press(tree, 'Cambiar estado');
  await pressText(tree, 'Hecha');
  await press(tree, 'Esfuerzo 5');
  await pressText(tree, 'Guardar como hecha');
  expect(feedbackMock).toHaveBeenCalledWith('s1', expect.objectContaining({ outcome: 'completed', srpe: 5, supersedesId: 'fb1' }));
});

test('marcar como no hecha envía el motivo en la nota', async () => {
  detailMock.mockResolvedValue(detail('pending'));
  feedbackMock.mockResolvedValue({});
  const tree = await mount();
  await press(tree, 'Cambiar estado');
  await pressText(tree, 'No hecha');
  await pressText(tree, 'Falta de tiempo');
  await pressText(tree, 'Guardar como no hecha');
  expect(feedbackMock).toHaveBeenCalledWith('s1', {
    outcome: 'skipped', notes: 'Motivo: Falta de tiempo.', supersedesId: undefined,
  });
});

test('volver a pendiente pide confirmación y reabre la sesión', async () => {
  detailMock.mockResolvedValue(detail('completed', [{ id: 'fb1', outcome: 'completed', srpe: 7, durationMinutes: 40, pain: false }]));
  reopenMock.mockResolvedValue({});
  const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
    buttons?.find(b => b.text === 'Volver a pendiente')?.onPress?.();
  });
  const tree = await mount();
  await press(tree, 'Cambiar estado');
  await pressText(tree, 'Pendiente');
  expect(alert).toHaveBeenCalled();
  expect(reopenMock).toHaveBeenCalledWith('s1');
  alert.mockRestore();
});

test('un error al guardar el estado se muestra en la hoja', async () => {
  detailMock.mockResolvedValue(detail('pending'));
  feedbackMock.mockRejectedValue(new Error('Ya cerraste esta sesión.'));
  const tree = await mount();
  await press(tree, 'Cambiar estado');
  await pressText(tree, 'No hecha');
  await pressText(tree, 'Guardar como no hecha');
  expect(texts(tree)).toContain('Ya cerraste esta sesión.');
});
