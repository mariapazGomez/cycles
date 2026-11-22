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

type Overrides = {
  equipment?: string[];
  targetRestSeconds?: number;
  targetWeight?: number;
  logs?: unknown[];
  targetPercentRm?: number | null;
  rmStatus?: 'ok' | 'missing' | 'needs_athlete' | null;
  resolvedWeightKg?: number | null;
};
const sessionExercise = (o: Overrides = {}) => ({
  id: 'se-1',
  sessionId: 's1',
  exerciseId: 'ex-1',
  orderIndex: 1,
  targetSets: 2,
  targetReps: 10,
  targetWeight: o.targetWeight,
  targetPercentRm: o.targetPercentRm,
  rmStatus: o.rmStatus,
  resolvedWeightKg: o.resolvedWeightKg,
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

describe('sin peso es 0, nunca «null» (CYC-284)', () => {
  const weightInput = (tree: ReactTestRenderer.ReactTestRenderer) =>
    tree.root.findAll(n => (n.type as unknown) === 'TextInput').map(n => n.props.value as string);

  test('con la meta de peso en null el campo parte en 0 y se guarda 0', async () => {
    const tree = await mount({ equipment: [], targetWeight: null as unknown as undefined });
    expect(weightInput(tree)).toContain('0');
    expect(weightInput(tree)).not.toContain('null');
    await press(tree, 'Guardar serie');
    expect(logSetMock.mock.calls[0][1].actualWeight).toBe(0);
    expect(joined(tree)).toContain('0 kg');
    expect(joined(tree)).not.toContain('null');
  });

  test('una serie guardada sin peso (null) se muestra como 0 kg', async () => {
    const tree = await mount({
      equipment: [],
      logs: [{ id: 'log-0', sessionExerciseId: 'se-1', setNumber: 1, actualReps: 10, actualWeight: null, rir: null }],
    });
    expect(joined(tree)).toContain('0 kg');
    expect(joined(tree)).not.toContain('null');
  });

  test('peso corporal con la meta en null: sin campo y sin «null»', async () => {
    const tree = await mount({ equipment: ['bodyweight'], targetWeight: null as unknown as undefined });
    expect(joined(tree)).not.toContain('Peso (kg)');
    expect(joined(tree)).toContain('Peso corporal');
    expect(joined(tree)).not.toContain('null');
  });
});

describe('carga como % del RM (CYC-313)', () => {
  const inputValues = (tree: ReactTestRenderer.ReactTestRenderer) =>
    tree.root.findAll(n => (n.type as unknown) === 'TextInput').map(n => n.props.value as string);

  test('con RM: meta con el peso calculado, comentario, nota del redondeo y peso prellenado', async () => {
    const tree = await mount({ equipment: [], targetPercentRm: 80, rmStatus: 'ok', resolvedWeightKg: 72.5 });
    const t = joined(tree);
    expect(t).toContain('Meta: 10 × 72,5 kg');
    expect(t).toContain('Estás levantando el 80 % de tu RM');
    expect(t).toContain('Peso redondeado a 2,5 kg para que calce con los discos.');
    expect(inputValues(tree)).toContain('72.5');
    await press(tree, 'Guardar serie');
    expect(logSetMock.mock.calls[0][1].actualWeight).toBe(72.5);
    expect(joined(tree)).toContain('10 reps · 72,5 kg');
  });

  test('sin RM: «Aún no hay peso calculado», el % en la meta y el peso en 0 para que registre el que use', async () => {
    const tree = await mount({ equipment: [], targetPercentRm: 75, rmStatus: 'missing', resolvedWeightKg: null });
    const t = joined(tree);
    expect(t).toContain('Meta: 10 reps al 75 % de tu RM');
    expect(t).toContain('Aún no hay peso calculado');
    expect(t).toContain('Tu coach indicó el 75 % de tu RM. Registra el peso que uses.');
    expect(t).not.toContain('Estás levantando');
    expect(t).not.toContain('null');
    expect(inputValues(tree)).toContain('0');
  });

  test('un ejercicio de peso corporal con % del RM sí pide el peso', async () => {
    const tree = await mount({ equipment: ['bodyweight'], targetPercentRm: 50, rmStatus: 'ok', resolvedWeightKg: 20 });
    expect(joined(tree)).toContain('Peso (kg)');
    expect(joined(tree)).toContain('Meta: 10 × 20 kg');
  });

  test('sin % la meta sigue como antes', async () => {
    const tree = await mount({ equipment: [], targetWeight: 60 });
    expect(joined(tree)).toContain('Meta: 10 × 60 kg');
    expect(joined(tree)).not.toContain('de tu RM');
  });
});
