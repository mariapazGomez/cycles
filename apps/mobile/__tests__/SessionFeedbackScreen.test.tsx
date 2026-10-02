import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { SessionFeedbackScreen } from '../src/screens/SessionFeedbackScreen';
import { submitFeedback } from '../src/services/executionApi';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../src/services/executionApi', () => ({ submitFeedback: jest.fn() }));

const submit = submitFeedback as jest.Mock;

function mount(doneSets: number, plannedSets = 19) {
  const navigation = { goBack: jest.fn() };
  const route = {
    params: { sessionId: 's1', doneSets, plannedSets, doneExercises: 4, totalExercises: 7 },
  };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <SessionFeedbackScreen {...(({ route, navigation } as unknown) as React.ComponentProps<typeof SessionFeedbackScreen>)} />,
    );
  });
  return { tree, navigation };
}

const press = async (tree: ReactTestRenderer.ReactTestRenderer, predicate: (n: ReactTestRenderer.ReactTestInstance) => boolean) => {
  const node = tree.root.find(n => predicate(n) && typeof n.props.onPress === 'function');
  await ReactTestRenderer.act(async () => {
    await node.props.onPress();
  });
};
const hasText = (tree: ReactTestRenderer.ReactTestRenderer, text: string) =>
  tree.root.findAll(n => n.props.children === text || (Array.isArray(n.props.children) && n.props.children.join('') === text)).length > 0;

beforeEach(() => jest.clearAllMocks());

test('con todas las series hechas propone "Hiciste las 19 series"', () => {
  const { tree } = mount(19);
  expect(hasText(tree, 'Hiciste las 19 series')).toBe(true);
  expect(hasText(tree, '¿Qué pasó con el resto?')).toBe(false);
});

test('con parte de las series propone parcial y pregunta el motivo', () => {
  const { tree } = mount(12);
  expect(hasText(tree, 'Hiciste 12 de 19 series')).toBe(true);
  expect(hasText(tree, '¿Qué pasó con el resto?')).toBe(true);
});

test('una sesión parcial se envía como completed con la parcialidad en la nota', async () => {
  submit.mockResolvedValue({});
  const { tree, navigation } = mount(12);
  await press(tree, n => n.props.accessibilityLabel === 'Esfuerzo 8');
  await press(tree, n => n.props.children?.props?.children === 'Falta de tiempo' || n.findAll(c => c.props.children === 'Falta de tiempo').length > 0 && typeof n.props.onPress === 'function' && n.props.style !== undefined);
  await press(tree, n => n.findAll(c => c.props.children === 'Enviar').length > 0);
  expect(submit).toHaveBeenCalledWith('s1', {
    outcome: 'completed',
    srpe: 8,
    pain: false,
    painNotes: undefined,
    notes: 'Sesión parcial: 12 de 19 series. Motivo: Falta de tiempo.',
  });
  expect(navigation.goBack).toHaveBeenCalled();
});

test('sin esfuerzo elegido no envía y avisa', async () => {
  const { tree } = mount(19);
  await press(tree, n => n.findAll(c => c.props.children === 'Enviar').length > 0);
  expect(submit).not.toHaveBeenCalled();
  expect(hasText(tree, 'Indica qué tan dura fue la sesión.')).toBe(true);
});

test('sin ninguna serie se envía skipped sin esfuerzo ni dolor', async () => {
  submit.mockResolvedValue({});
  const { tree } = mount(0);
  expect(hasText(tree, '¿Qué tan dura fue?')).toBe(false);
  await press(tree, n => n.findAll(c => c.props.children === 'Enviar').length > 0);
  expect(submit).toHaveBeenCalledWith('s1', {
    outcome: 'skipped',
    srpe: undefined,
    pain: false,
    painNotes: undefined,
    notes: undefined,
  });
});
