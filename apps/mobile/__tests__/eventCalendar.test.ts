import {
  addDays,
  calendarWeek,
  compareEvents,
  groupByDay,
  monthGrid,
  monthRange,
  shiftMonth,
  startOfWeek,
  timeLabel,
  todaySummary,
  visibleWithOverflow,
  weekdayOf,
} from '../src/utils/eventCalendar';

const ev = (date: string, title: string, startTime: string | null = null, allDay = false) => ({
  seriesId: title, date, isException: false, type: 'training' as const, sport: null, title, startTime, durationMin: null, allDay,
  intensity: null, notes: null, repeat: null,
});

test('weekdayOf: 0 = lunes … 6 = domingo; startOfWeek da el lunes', () => {
  expect(weekdayOf('2026-11-02')).toBe(0); // lunes
  expect(weekdayOf('2026-11-08')).toBe(6); // domingo
  expect(startOfWeek('2026-11-08')).toBe('2026-11-02');
  expect(startOfWeek('2026-11-02')).toBe('2026-11-02');
});

test('addDays cruza meses y años sin zona horaria', () => {
  expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
});

test('calendarWeek devuelve lunes a domingo', () => {
  const week = calendarWeek('2026-11-05');
  expect(week.map(d => d.iso)).toEqual(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08']);
  expect(week.map(d => d.weekday)).toEqual([0, 1, 2, 3, 4, 5, 6]);
});

test('monthGrid: semanas completas, con relleno marcado fuera del mes', () => {
  const rows = monthGrid(2026, 11); // 1 nov 2026 es domingo; 30 nov es lunes
  expect(rows).toHaveLength(6);
  expect(rows[0][0].iso).toBe('2026-10-26');
  expect(rows[0][6]).toMatchObject({ iso: '2026-11-01', inMonth: true });
  expect(rows[0][0].inMonth).toBe(false);
  expect(rows[5][0]).toMatchObject({ iso: '2026-11-30', inMonth: true });
  expect(rows[5][6]).toMatchObject({ iso: '2026-12-06', inMonth: false });
  rows.forEach(row => expect(row).toHaveLength(7));
});

test('monthGrid: febrero que empieza en lunes y termina en domingo ocupa 4 filas', () => {
  const rows = monthGrid(2027, 2); // 1 feb 2027 es lunes; 28 feb es domingo
  expect(rows).toHaveLength(4);
  expect(rows.flat().every(d => d.inMonth)).toBe(true);
});

test('monthRange cubre el mes completo con sus días de relleno', () => {
  expect(monthRange(2026, 11)).toEqual({ from: '2026-10-26', to: '2026-12-06' });
});

test('el rango de un mes cabe en el máximo que acepta la API (92 días)', () => {
  for (let month = 1; month <= 12; month++) {
    const { from, to } = monthRange(2026, month);
    const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000 + 1;
    expect(days).toBeLessThanOrEqual(92);
  }
});

test('shiftMonth cruza el año hacia los dos lados', () => {
  expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
  expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  expect(shiftMonth(2026, 11, 0)).toEqual({ year: 2026, month: 11 });
});

test('groupByDay agrupa y ordena: todo el día primero, luego por hora, sin hora al final de las del día', () => {
  const groups = groupByDay([
    ev('2026-11-07', 'Cena', '21:00'),
    ev('2026-11-07', 'Liga', null, true),
    ev('2026-11-07', 'Gimnasio', '08:00'),
    ev('2026-11-08', 'Descanso'),
  ]);
  expect(Object.keys(groups).sort()).toEqual(['2026-11-07', '2026-11-08']);
  expect(groups['2026-11-07'].map(e => e.title)).toEqual(['Liga', 'Gimnasio', 'Cena']);
  expect(compareEvents(ev('d', 'A'), ev('d', 'B'))).toBeLessThan(0);
});

test('visibleWithOverflow: las primeras y cuántas más («+N»)', () => {
  expect(visibleWithOverflow([1, 2, 3, 4], 2)).toEqual({ shown: [1, 2], extra: 2 });
  expect(visibleWithOverflow([1], 2)).toEqual({ shown: [1], extra: 0 });
  expect(visibleWithOverflow([1, 2], 0)).toEqual({ shown: [], extra: 2 });
});

test('todaySummary: una actividad, varias y ninguna', () => {
  expect(todaySummary([])).toBe('');
  expect(todaySummary([ev('d', 'Voleibol', '19:00')])).toBe('Hoy también: voleibol, 19:00');
  expect(todaySummary([ev('d', 'Voleibol', '19:00'), ev('d', 'Gimnasio', '08:00')])).toBe('Hoy también: gimnasio y 1 más');
});

test('timeLabel: hora y duración, todo el día o sin hora', () => {
  expect(timeLabel({ ...ev('d', 'x', '19:00'), durationMin: 90 })).toBe('19:00 · 90 min');
  expect(timeLabel(ev('d', 'x', null, true))).toBe('Todo el día');
  expect(timeLabel(ev('d', 'x'))).toBe('Sin hora');
});

import { longDay, monthCell, monthOf, monthTitle } from '../src/utils/eventCalendar';

test('monthTitle, longDay y monthOf en español', () => {
  expect(monthTitle(2026, 11)).toBe('Noviembre 2026');
  expect(longDay('2026-11-13')).toBe('viernes 13 de noviembre');
  expect(longDay('2026-03-01')).toBe('domingo 1 de marzo');
  expect(monthOf('2026-11-13')).toEqual({ year: 2026, month: 11 });
});

test('monthCell: 2 perlas o menos se muestran; con más, una perla y «+N»; con letra grande, una y «+N»', () => {
  const day = { iso: '2026-11-13', day: 13, weekday: 4, inMonth: true };
  const events = (n: number) => Array.from({ length: n }, (_, i) => ev('2026-11-13', `A${i}`));
  expect(monthCell(day, events(0))).toMatchObject({ shown: [], extra: 0 });
  expect(monthCell(day, events(1))).toMatchObject({ extra: 0 });
  expect(monthCell(day, events(1)).shown).toHaveLength(1);
  expect(monthCell(day, events(2)).shown).toHaveLength(2);
  const three = monthCell(day, events(3));
  expect(three.shown).toHaveLength(1);
  expect(three.extra).toBe(2);
  const big = monthCell(day, events(2), true);
  expect(big.shown).toHaveLength(1);
  expect(big.extra).toBe(1);
  expect(monthCell(day, events(1), true)).toMatchObject({ extra: 0 });
});
