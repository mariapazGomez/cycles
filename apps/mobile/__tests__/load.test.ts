import { loadLabel, prefillWeight, resolvedKg, targetLine } from '../src/utils/load';

// CYC-313: la carga del ejercicio tal como la ve el atleta (docs/diseno/rm-porcentaje).
const base = { targetSets: 4, targetReps: 6 };
const barbell = { equipment: ['barbell' as const] };
const bodyweight = { equipment: ['bodyweight' as const] };

describe('loadLabel / targetLine', () => {
  test('con RM: el peso ya calculado, con coma decimal', () => {
    const item = { ...base, targetPercentRm: 80, rmStatus: 'ok' as const, resolvedWeightKg: 72.5, exercise: barbell };
    expect(loadLabel(item)).toBe('72,5 kg');
    expect(targetLine(item)).toBe('4 × 6 · 72,5 kg');
  });

  test('con % y sin RM: «75 % de tu RM»', () => {
    const item = { targetSets: 3, targetReps: 10, targetPercentRm: 75, rmStatus: 'missing' as const, resolvedWeightKg: null, exercise: barbell };
    expect(loadLabel(item)).toBe('75 % de tu RM');
    expect(targetLine(item)).toBe('3 × 10 · 75 % de tu RM');
  });

  test('un % con el RM aún sin calcular nunca muestra «null» ni «undefined»', () => {
    const item = { ...base, targetPercentRm: 80, rmStatus: 'ok' as const, resolvedWeightKg: null };
    expect(targetLine(item)).toBe('4 × 6 · 80 % de tu RM');
    expect(targetLine({ ...base, targetPercentRm: 80, rmStatus: null, resolvedWeightKg: undefined })).not.toMatch(/null|undefined/);
  });

  test('peso fijo, sin carga y peso corporal siguen como antes', () => {
    expect(targetLine({ ...base, targetWeight: 60, targetPercentRm: null, exercise: barbell })).toBe('4 × 6 · 60 kg');
    expect(targetLine({ ...base, targetWeight: 62.5, exercise: barbell })).toBe('4 × 6 · 62,5 kg');
    expect(targetLine({ ...base, targetWeight: null as unknown as undefined, targetPercentRm: null, exercise: barbell })).toBe('4 × 6');
    expect(targetLine({ ...base, exercise: bodyweight })).toBe('4 × 6 · Peso corporal');
  });

  test('un ejercicio de peso corporal con % del RM muestra el % (todos los ejercicios pueden tener RM)', () => {
    const item = { ...base, targetPercentRm: 50, rmStatus: 'ok' as const, resolvedWeightKg: 20, exercise: bodyweight };
    expect(targetLine(item)).toBe('4 × 6 · 20 kg');
  });
});

describe('resolvedKg / prefillWeight', () => {
  test('el peso calculado solo vale con rmStatus ok', () => {
    expect(resolvedKg({ ...base, targetPercentRm: 80, rmStatus: 'ok', resolvedWeightKg: 72.5 })).toBe(72.5);
    expect(resolvedKg({ ...base, targetPercentRm: 80, rmStatus: 'missing', resolvedWeightKg: 72.5 })).toBeNull();
    expect(resolvedKg({ ...base, targetWeight: 60 })).toBeNull();
  });

  test('el campo parte en el peso calculado, el fijo o 0, nunca en null', () => {
    expect(prefillWeight({ ...base, targetPercentRm: 80, rmStatus: 'ok', resolvedWeightKg: 72.5 })).toBe(72.5);
    expect(prefillWeight({ ...base, targetPercentRm: 75, rmStatus: 'missing', resolvedWeightKg: null })).toBe(0);
    expect(prefillWeight({ ...base, targetWeight: 60, targetPercentRm: null })).toBe(60);
    expect(prefillWeight({ ...base, targetWeight: null as unknown as undefined })).toBe(0);
  });
});
