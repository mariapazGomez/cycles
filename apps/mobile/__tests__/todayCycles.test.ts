import type { TodayCycleEntry } from '@cycles/shared';
import { cardDayLabel, cardTitle, compactLine, layoutCycles, todayCards } from '../src/utils/todayCycles';

// CYC-314: «Hoy» con dos ciclos a la vez (docs/diseno/ciclo-del-equipo).
const TODAY = '2026-11-25';
const session = (id: string, name: string, over: object = {}) =>
  ({ id, name, weekNumber: 1, slotNumber: 1, status: 'pending', startedAt: null, scheduledDate: `${TODAY}T00:00:00.000Z`, sessionExercises: [{}, {}, {}, {}], ...over }) as unknown as TodayCycleEntry['pending'][number];
const entry = (cycle: string, over: Partial<TodayCycleEntry> = {}): TodayCycleEntry => ({
  cycle: { id: cycle, name: cycle, currentWeek: 1 }, pending: [], upcoming: false, done: [], ...over,
});
const done = (id: string) => ({ id, name: id, weekNumber: 1, slotNumber: 1, exercises: { done: 3, total: 3 } });

describe('layoutCycles', () => {
  const two = [entry('Fuerza', { pending: [session('a', 'Torso')] }), entry('Hombro', { pending: [session('b', 'Movilidad')] })];

  test('dos pendientes sin empezar: dos tarjetas grandes en el orden de la API y ninguna lista', () => {
    const l = layoutCycles(two, TODAY, null);
    expect(l.heroes.map(c => c.key)).toEqual(['a', 'b']);
    expect(l.compacts).toEqual([]);
    expect(l.active).toBeNull();
  });

  test('con una empezada, esa es la grande y la otra queda compacta', () => {
    const l = layoutCycles([two[0], entry('Hombro', { pending: [session('b', 'Movilidad', { startedAt: `${TODAY}T10:00:00Z` })] })], TODAY, null);
    expect(l.heroes.map(c => c.key)).toEqual(['b']);
    expect(l.compacts.map(c => c.key)).toEqual(['a']);
    expect(l.active?.key).toBe('b');
  });

  test('«Ver» pone esa tarjeta como grande aunque otra esté empezada; una clave que ya no existe se ignora', () => {
    const entries = [two[0], entry('Hombro', { pending: [session('b', 'Movilidad', { startedAt: `${TODAY}T10:00:00Z` })] })];
    expect(layoutCycles(entries, TODAY, 'a').heroes.map(c => c.key)).toEqual(['a']);
    expect(layoutCycles(entries, TODAY, 'ya-no-esta').heroes.map(c => c.key)).toEqual(['b']);
  });

  test('una hecha queda compacta y la pendiente va arriba', () => {
    const l = layoutCycles([entry('Fuerza', { done: [done('a')] }), two[1]], TODAY, null);
    expect(l.heroes.map(c => c.key)).toEqual(['b']);
    expect(l.compacts.map(c => [c.kind, compactLine(c, TODAY)])).toEqual([['done', 'Hecha hoy']]);
  });

  test('sin sesión hoy, el ciclo muestra su próxima con la fecha en una compacta', () => {
    const l = layoutCycles([two[0], entry('Hombro', { upcoming: true, pending: [session('b', 'Movilidad', { scheduledDate: '2026-11-27T00:00:00.000Z' })] })], TODAY, null);
    expect(l.heroes.map(c => c.key)).toEqual(['a']);
    expect(compactLine(l.compacts[0], TODAY)).toBe('Próxima: viernes 27');
  });

  test('la atrasada va después de la de hoy y se titula «Pendiente: …»', () => {
    const cards = todayCards([entry('Fuerza', { pending: [session('v', 'Piernas', { scheduledDate: '2026-11-23T00:00:00.000Z' })] }), two[1]], TODAY);
    expect(cards.map(c => c.key)).toEqual(['b', 'v']);
    expect(cards[1].kind).toBe('overdue');
    expect(cardTitle(cards[1])).toBe('Pendiente: Piernas');
    expect(compactLine(cards[1], TODAY)).toBe('Era para el lunes 23');
  });

  test('si el ciclo ya tiene una hecha hoy, no suma su atrasada ni su próxima', () => {
    const cards = todayCards([entry('Fuerza', { done: [done('x')], pending: [session('v', 'Piernas', { scheduledDate: '2026-11-23T00:00:00.000Z' })] })], TODAY);
    expect(cards.map(c => c.kind)).toEqual(['done']);
  });
});

test('la fecha lleva el mes cuando es de otro mes', () => {
  expect(cardDayLabel('2026-12-04T00:00:00.000Z', TODAY)).toBe('viernes 4 dic');
});
