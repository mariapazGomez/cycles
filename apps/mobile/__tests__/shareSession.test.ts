import type { Exercise, ExerciseLog, SessionExercise } from '@cycles/shared';
import { buildShareData, fitTitle, shareAltText } from '../src/utils/shareSession';

const item = (group: Exercise['muscleGroup'], target: number, logs: string[]) =>
  ({
    id: `${group}-${target}`,
    targetSets: target,
    exercise: { id: 'e', name: 'E', muscleGroup: group, equipment: [], isActive: true },
    logs: logs.map((loggedAt, i) => ({ id: `${i}`, setNumber: i + 1, loggedAt }) as ExerciseLog),
  }) as unknown as SessionExercise & { exercise: Exercise; logs: ExerciseLog[] };

describe('buildShareData', () => {
  it('cuenta series por grupo, ejercicios terminados y minutos hasta la última serie', () => {
    const data = buildShareData(
      'Tirón',
      [
        item('back', 3, ['2026-11-16T10:05:00Z', '2026-11-16T10:10:00Z', '2026-11-16T10:20:00Z']),
        item('arms', 3, ['2026-11-16T10:30:00Z', '2026-11-16T10:40:00Z']),
        item('cardio', 1, ['2026-11-16T10:50:00Z']),
      ],
      '2026-11-16T10:00:00Z',
    );
    expect(data.groups.back).toBe(3);
    expect(data.groups.arms).toBe(2);
    expect(Object.values(data.groups).reduce((a, b) => a + b, 0)).toBe(5);
    expect(data.sets).toBe(6);
    expect(data.exercises).toBe(2);
    expect(data.minutes).toBe(50);
  });

  it('sin hora de inicio no inventa minutos', () => {
    expect(buildShareData('X', [item('legs', 1, ['2026-11-16T10:05:00Z'])], null).minutes).toBeNull();
  });
});

describe('texto', () => {
  it('describe la sesión con los dos grupos más trabajados', () => {
    const data = buildShareData('Tirón', [item('back', 2, ['2026-11-16T10:05:00Z', '2026-11-16T10:06:00Z']), item('arms', 1, ['2026-11-16T10:07:00Z'])], '2026-11-16T10:00:00Z');
    expect(shareAltText(data)).toBe('Sesión Tirón: 2 ejercicios, 3 series, 7 minutos. Grupos más trabajados: espalda y brazos.');
  });

  it('achica y recorta los nombres largos', () => {
    expect(fitTitle('Tirón', 100)).toEqual({ text: 'Tirón', size: 100 });
    const long = fitTitle('Empuje de pecho y hombros con accesorios', 100);
    expect(long.text.length).toBe(22);
    expect(long.size).toBeLessThan(100);
  });
});
