import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { ExerciseLogScreen } from '../src/screens/ExerciseLogScreen';
import { logSet } from '../src/services/executionApi';

jest.mock('../src/services/executionApi', () => ({ logSet: jest.fn() }));
const mockStartRest = jest.fn();
jest.mock('../src/store/RestTimerContext', () => ({
  useRestTimer: () => ({ startRest: mockStartRest }),
}));
jest.mock('../src/components/RestTimer', () => ({ RestBar: () => null }));
jest.mock('../src/components/tour/FirstUseHints', () => ({
  FirstSetHint: () => null,
  useFirstSetHint: () => ({ visible: false, dismiss: () => {} }),
}));
jest.mock('../src/components/ExerciseVideo', () => ({
  ExerciseVideoButton: () => null,
  VideoHint: () => null,
  playableUrl: () => null,
  useVideoHint: () => ({ visible: false, dismiss: () => {} }),
}));

const logSetMock = logSet as jest.Mock;

type Overrides = { equipment?: string[]; targetRestSeconds?: number; targetWeight?: number; logs?: unknown[] };
const sessionExercise = (o: Overrides = {}) => ({
  id: 'se-1',
  sessionId: 's1',
  exerciseId: 'ex-1',
  orderIndex: 1,
  targetSets: 2,
  targetReps: 10,
  targetWeight: o.targetWeight,
  targetRestSeconds: o.targetRestSeconds,
  exercise: { id: 'ex-1', name: 'Dominadas', equipment: o.equipment ?? ['barbell'], isActive: true },
  logs: o.logs ?? [],
});

async function mount(o: Overrides = {}) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <ExerciseLogScreen
        {...(({ route: { params: { sessionExercise: sessionExercise(o) } } } as unknown) as React.ComponentProps<typeof ExerciseLogScreen>)}
      />,
    );
  });
  return tree;
}
const joined = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => [n.props.children].flat(Infinity).join(''))
    .join(' | ');
async function press(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  const target = tree.root.find(
    n => typeof n.props.onPress === 'function' && n.findAll(c => c.props.children === label).length > 0,
  );
  await ReactTestRenderer.act(async () => {
    target.props.onPress();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  logSetMock.mockImplementation(async (_id: string, body: Record<string, unknown>) => ({
    id: 'log-1',
    sessionExerciseId: 'se-1',
    setNumber: body.setNumber,
    actualReps: body.actualReps,
    actualWeight: body.actualWeight ?? null,
    rir: null,
  }));
});

describe('descanso (CYC-281, CYC-282)', () => {
  test('al registrar una serie nueva inicia el descanso que planificó el coach', async () => {
    const tree = await mount({ targetRestSeconds: 120 });
    await press(tree, 'Guardar serie');
    expect(mockStartRest).toHaveBeenCalledTimes(1);
    expect(mockStartRest).toHaveBeenCalledWith(120);
  });

  test('sin descanso planificado el descanso es 0 (no hay por defecto)', async () => {
    const tree = await mount();
    await press(tree, 'Guardar serie');
    expect(mockStartRest).toHaveBeenCalledWith(0);
  });

  test('corregir una serie ya registrada no inicia ni reinicia el descanso', async () => {
    const tree = await mount({
      targetRestSeconds: 120,
      logs: [{ id: 'log-0', sessionExerciseId: 'se-1', setNumber: 1, actualReps: 10, actualWeight: 40, rir: null }],
    });
    await press(tree, 'Editar');
    await press(tree, 'Guardar corrección');
    expect(logSetMock).toHaveBeenCalledWith('se-1', expect.objectContaining({ supersedesId: 'log-0' }));
    expect(mockStartRest).not.toHaveBeenCalled();
  });
});

describe('peso corporal', () => {
  test('no pide peso, lo dice y guarda la serie sin peso', async () => {
    const tree = await mount({ equipment: ['bodyweight'], targetWeight: 20 });
    const text = joined(tree);
    expect(text).not.toContain('Peso (kg)');
    expect(text).toContain('Peso corporal');
    await press(tree, 'Guardar serie');
    expect(logSetMock.mock.calls[0][1].actualWeight).toBeUndefined();
    expect(joined(tree)).toContain('Peso corporal');
    expect(joined(tree)).not.toContain('null');
  });

  test('un ejercicio con implemento sigue pidiendo el peso', async () => {
    const tree = await mount({ equipment: ['barbell'], targetWeight: 60 });
    expect(joined(tree)).toContain('Peso (kg)');
    expect(joined(tree)).toContain('× 60 kg');
  });
});
