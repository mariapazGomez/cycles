import type { TrainingSession } from '@cycles/shared';
import {
  GROUPS,
  axisScale,
  barsByDay,
  barsByWeek,
  groupFill,
  intensityColor,
  shares,
  totalsByGroup,
  weekStreak,
  type MuscleDay,
} from '../src/utils/muscleSummary';

const zero = { legs: 0, back: 0, chest: 0, shoulders: 0, glutes: 0, arms: 0, core: 0 };
type DayInput = Partial<Omit<MuscleDay, 'sets' | 'kg'>> & { sets?: Partial<typeof zero>; kg?: Partial<typeof zero> };
const day = (over: DayInput): MuscleDay => ({
  sessionId: 's', name: 'S', weekNumber: 1, trainedAt: '2026-10-05T15:00:00.000Z',
  ...over, sets: { ...zero, ...over.sets }, kg: { ...zero, ...over.kg },
});

test('el orden de los grupos es el de apilado y de la paleta', () => {
  expect(GROUPS.map(g => g.key)).toEqual(['legs', 'back', 'chest', 'shoulders', 'glutes', 'arms', 'core']);
});

test('suma en una sola barra las sesiones del mismo día', () => {
  const bars = barsByDay(
    [
      day({ sessionId: 'a', trainedAt: '2026-10-05T15:00:00.000Z', sets: { legs: 4, core: 2 } }),
      day({ sessionId: 'b', trainedAt: '2026-10-05T17:00:00.000Z', sets: { legs: 1, chest: 3 } }),
      day({ sessionId: 'c', trainedAt: '2026-10-07T15:00:00.000Z', sets: { back: 5 } }),
    ],
    'sets',
  );
  expect(bars).toHaveLength(2);
  expect(bars[0].values).toEqual([5, 0, 3, 0, 0, 0, 2]);
  expect(bars[1].values).toEqual([0, 5, 0, 0, 0, 0, 0]);
});

test('usa kilos o series según la métrica', () => {
  const d = [day({ sets: { legs: 3 }, kg: { legs: 1800 } })];
  expect(barsByDay(d, 'sets')[0].values[0]).toBe(3);
  expect(barsByDay(d, 'kg')[0].values[0]).toBe(1800);
});

test('agrupa por semana del plan', () => {
  const bars = barsByWeek(
    [day({ weekNumber: 2, sets: { legs: 2 } }), day({ weekNumber: 1, sets: { legs: 1 } }), day({ weekNumber: 2, sets: { back: 4 } })],
    'sets',
  );
  expect(bars.map(b => b.line1)).toEqual(['S1', 'S2']);
  expect(bars[1].values).toEqual([2, 4, 0, 0, 0, 0, 0]);
  expect(bars[1].title).toBe('Semana 2');
});

test('totales por grupo, de todo el plan o de una semana', () => {
  const d = [day({ weekNumber: 1, sets: { legs: 2 } }), day({ weekNumber: 2, sets: { legs: 3, core: 1 } })];
  expect(totalsByGroup(d, 'sets')[0]).toBe(5);
  expect(totalsByGroup(d, 'sets', 2)).toEqual([3, 0, 0, 0, 0, 0, 1]);
});

test('el reparto suma 100% y deja fuera los grupos sin carga', () => {
  const s = shares([6, 2, 0, 0, 0, 0, 2]);
  expect(s.map(x => x.key)).toEqual(['legs', 'back', 'core']);
  expect(Math.round(s.reduce((a, x) => a + x.pct, 0))).toBe(100);
  expect(Math.round(s[0].pct)).toBe(60);
  expect(shares([0, 0, 0, 0, 0, 0, 0])).toEqual([]);
});

test('la escala del eje usa pasos redondos con hasta 5 divisiones', () => {
  expect(axisScale(23)).toEqual({ step: 5, max: 25 });
  expect(axisScale(4150)).toEqual({ step: 1000, max: 5000 });
  expect(axisScale(0)).toEqual({ step: 5, max: 5 });
});

test('la intensidad va del azul claro al oscuro y el gris es solo para sin carga', () => {
  expect(intensityColor(0)).toBe('#cfe0fd');
  expect(intensityColor(1)).toBe('#0d2f78');
  expect(groupFill(0, 10, '#dfe4ec')).toBe('#dfe4ec');
  expect(groupFill(10, 10, '#dfe4ec')).toBe('#0d2f78');
  expect(groupFill(1, 100, '#dfe4ec')).not.toBe('#dfe4ec');
});

test('la racha cuenta semanas seguidas con sesión hecha', () => {
  const s = (week: number, status: string) => ({ weekNumber: week, status }) as TrainingSession;
  expect(weekStreak([s(1, 'completed'), s(2, 'completed'), s(3, 'completed')], 3)).toBe(3);
  // la semana actual aún sin sesión hecha no rompe la racha
  expect(weekStreak([s(1, 'completed'), s(2, 'completed'), s(3, 'pending')], 3)).toBe(2);
  expect(weekStreak([s(1, 'completed'), s(2, 'skipped'), s(3, 'completed')], 3)).toBe(1);
  expect(weekStreak([s(1, 'pending')], 1)).toBe(0);
});
