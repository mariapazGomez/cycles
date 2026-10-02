import type { TrainingCycle, TrainingSession } from '@cycles/shared';
import {
  firstPending,
  formatWeekRange,
  planWeekAt,
  sessionState,
  totalWeeks,
  weekProgress,
} from '../src/utils/planCalendar';

const session = (over: Partial<TrainingSession>): TrainingSession =>
  ({ id: 's', cycleId: 'c', name: 'S', weekNumber: 1, slotNumber: 1, status: 'pending', ...over }) as TrainingSession;

test('la semana del plan cuenta bloques de 7 días desde el inicio', () => {
  const start = '2026-10-02T00:00:00.000Z';
  expect(planWeekAt(start, new Date('2026-10-01T12:00:00Z'))).toBe(0);
  expect(planWeekAt(start, new Date('2026-10-02T00:00:00Z'))).toBe(1);
  expect(planWeekAt(start, new Date('2026-10-08T23:59:00Z'))).toBe(1);
  expect(planWeekAt(start, new Date('2026-10-09T00:00:00Z'))).toBe(2);
});

test('el rango de la semana no se corre con la zona horaria', () => {
  const start = '2026-10-02T00:00:00.000Z';
  expect(formatWeekRange(start, 1)).toBe('2 al 8 de octubre');
  expect(formatWeekRange(start, 2)).toBe('9 al 15 de octubre');
  expect(formatWeekRange(start, 4)).toBe('23 al 29 de octubre');
  expect(formatWeekRange(start, 5)).toBe('30 de octubre al 5 de noviembre');
});

test('total de semanas toma el mayor entre fechas y sesiones', () => {
  const cycle = { startDate: '2026-10-02T00:00:00Z', endDate: '2026-11-05T00:00:00Z' } as TrainingCycle;
  expect(totalWeeks(cycle, [])).toBe(5);
  expect(totalWeeks(cycle, [session({ weekNumber: 7 })])).toBe(7);
});

test('estado de cada sesión y primera pendiente', () => {
  const a = session({ id: 'a', status: 'completed' });
  const b = session({ id: 'b', status: 'skipped', slotNumber: 2 });
  const c = session({ id: 'c', weekNumber: 1, slotNumber: 3 });
  const d = session({ id: 'd', weekNumber: 2, slotNumber: 1 });
  const e = session({ id: 'e', weekNumber: 3, slotNumber: 1 });
  const all = [e, d, c, b, a];
  expect(firstPending(all)?.id).toBe('c');
  const states = all.map(s => sessionState(s, 'c', 2).toString());
  expect(states).toEqual(['pending', 'pending', 'next', 'skipped', 'done']);
  expect(sessionState(session({ id: 'x', weekNumber: 1 }), 'c', 2)).toBe('late');
});

test('progreso de una semana cuenta sesiones resueltas', () => {
  const list = [
    session({ id: '1', status: 'completed' }),
    session({ id: '2', status: 'skipped', slotNumber: 2 }),
    session({ id: '3', slotNumber: 3 }),
    session({ id: '4', weekNumber: 2 }),
  ];
  expect(weekProgress(list, 1)).toEqual({ done: 2, total: 3 });
});
