import {
  formatChange,
  summarizeExercise,
  summarizeExercises,
} from '../src/utils/exerciseProgress';

const session = (week: number, weight: number | null, reps: number) => ({
  sessionId: `s${week}`,
  weekNumber: week,
  date: '2026-10-01T00:00:00.000Z',
  plannedSets: 3,
  plannedReps: 6,
  plannedWeight: weight,
  plannedRir: null,
  actualWeight: weight,
  actualReps: reps,
  series: [],
});
const ex = (id: string, sessions: ReturnType<typeof session>[]) => ({
  exerciseId: id,
  name: id,
  muscleGroup: null,
  sessions,
});

test('resume de dónde partió, dónde está y cuánto cambió', () => {
  const s = summarizeExercise(
    ex('a', [session(1, 60, 6), session(2, 65, 6), session(3, 70, 5)]),
  );
  expect(s).toMatchObject({
    firstWeight: 60,
    lastWeight: 70,
    weightDelta: 10,
    firstReps: 6,
    lastReps: 5,
    repsDelta: -1,
    hasWeight: true,
  });
  expect(s.weights).toEqual([60, 65, 70]);
});

test('peso corporal: no hay peso y el cambio de peso es 0', () => {
  const s = summarizeExercise(
    ex('d', [session(1, null, 6), session(2, null, 8)]),
  );
  expect(s).toMatchObject({
    hasWeight: false,
    firstWeight: null,
    weightDelta: 0,
    repsDelta: 2,
  });
});

test('ordena primero los que más cambiaron y descarta los de una sola sesión', () => {
  const list = summarizeExercises([
    ex('quieto', [session(1, 40, 8), session(2, 40, 8)]),
    ex('sube', [session(1, 80, 5), session(2, 100, 5)]),
    ex('uno', [session(1, 10, 10)]),
  ]);
  expect(list.map(x => x.id)).toEqual(['sube', 'quieto']);
});

test('formatChange usa flechas, coma decimal y no juzga', () => {
  expect(formatChange(10, 'kg')).toBe('▲ +10 kg');
  expect(formatChange(-2.5, 'kg')).toBe('▼ −2,5 kg');
  expect(formatChange(-1)).toBe('▼ −1');
  expect(formatChange(0)).toBe('= sin cambio');
});
