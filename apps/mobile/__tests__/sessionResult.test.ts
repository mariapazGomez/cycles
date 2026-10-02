import { buildNotes, deduceResult, effortLabel } from '../src/utils/sessionResult';

test('deduce el resultado de las series registradas', () => {
  expect(deduceResult(19, 19)).toBe('completed');
  expect(deduceResult(12, 19)).toBe('partial');
  expect(deduceResult(0, 19)).toBe('skipped');
});

test('palabra del esfuerzo según el rango', () => {
  expect(effortLabel(0)).toBe('Muy suave');
  expect(effortLabel(4)).toBe('Suave');
  expect(effortLabel(6)).toBe('Moderada');
  expect(effortLabel(7)).toBe('Dura');
  expect(effortLabel(10)).toBe('Máxima');
});

test('la nota incluye parcialidad y motivo antes del texto libre', () => {
  expect(
    buildNotes({ result: 'partial', doneSets: 12, plannedSets: 19, reason: 'Falta de tiempo', notes: 'Me dolió un poco' }),
  ).toBe('Sesión parcial: 12 de 19 series. Motivo: Falta de tiempo. Me dolió un poco');
  expect(buildNotes({ result: 'skipped', doneSets: 0, plannedSets: 19, reason: 'Cansancio', notes: '' })).toBe('Motivo: Cansancio.');
  expect(buildNotes({ result: 'completed', doneSets: 19, plannedSets: 19, reason: null, notes: '  ' })).toBeUndefined();
});
