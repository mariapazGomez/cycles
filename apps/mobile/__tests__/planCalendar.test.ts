import type { TrainingCycle, TrainingSession } from '@cycles/shared';
import {
  firstPending,
  formatDay,
  isDayInPlan,
  sessionDay,
  toLocalDay,
  weekDays,
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

test('los días de una semana del plan empiezan el día en que empieza el plan', () => {
  const days = weekDays('2026-10-02T00:00:00.000Z', 1); // viernes
  expect(days.map(d => d.letter).join('')).toBe('VSDLMXJ');
  expect(days[0]).toMatchObject({ iso: '2026-10-02', day: 2, name: 'viernes' });
  expect(weekDays('2026-10-02T00:00:00.000Z', 2)[0].iso).toBe('2026-10-09');
});

test('el día asignado se lee de la fecha UTC y el "hoy" del atleta de su hora local', () => {
  expect(sessionDay(session({ scheduledDate: '2026-10-05T00:00:00.000Z' }))).toBe('2026-10-05');
  expect(sessionDay(session({}))).toBeNull();
  expect(toLocalDay(new Date(2026, 9, 5, 23, 30))).toBe('2026-10-05');
});

test('un día solo es válido dentro de las fechas del plan', () => {
  const cycle = { startDate: '2026-10-02T00:00:00.000Z', endDate: '2026-11-05T00:00:00.000Z' } as TrainingCycle;
  expect(isDayInPlan('2026-10-02', cycle)).toBe(true);
  expect(isDayInPlan('2026-11-05', cycle)).toBe(true);
  expect(isDayInPlan('2026-10-01', cycle)).toBe(false);
  expect(isDayInPlan('2026-11-06', cycle)).toBe(false);
});

test('formatea un día como "viernes 17"', () => {
  expect(formatDay('2026-07-17')).toBe('viernes 17');
});
