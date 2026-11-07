import { createEvent, deleteEvent, fetchEvents, updateEvent } from '../src/services/eventsApi';
import { apiRequest } from '../src/services/httpClient';
import { groupByDay } from '../src/utils/eventCalendar';
const { athleteEventsFixture } = require('../../../packages/shared/src/fixtures/athleteEvents');

jest.mock('../src/services/httpClient', () => ({ apiRequest: jest.fn() }));
const api = apiRequest as jest.Mock;

beforeEach(() => api.mockReset());

test('desenvuelve la respuesta { events } y pide el rango', async () => {
  api.mockResolvedValue(athleteEventsFixture);
  const list = await fetchEvents('2026-11-02', '2026-11-08');
  expect(list).toHaveLength(3);
  expect(api).toHaveBeenCalledWith('/me/events?from=2026-11-02&to=2026-11-08');
});

test('contrato: la respuesta de ejemplo se agrupa por día sin errores (CYC-249)', async () => {
  api.mockResolvedValue(athleteEventsFixture);
  const groups = groupByDay(await fetchEvents('2026-11-02', '2026-11-08'));
  expect(Object.keys(groups)).toEqual(['2026-11-02', '2026-11-03', '2026-11-07']);
  expect(groups['2026-11-03'][0]).toMatchObject({ isException: true, startTime: '20:00' });
  expect(groups['2026-11-07'][0]).toMatchObject({ allDay: true, type: 'match' });
});

test('acepta una lista suelta y trata cualquier otra forma como sin actividades', async () => {
  api.mockResolvedValue(athleteEventsFixture.events);
  expect(await fetchEvents('a', 'b')).toHaveLength(3);
  api.mockResolvedValue({ otraCosa: 1 });
  expect(await fetchEvents('a', 'b')).toEqual([]);
  api.mockResolvedValue(null);
  expect(await fetchEvents('a', 'b')).toEqual([]);
});

test('crear, editar y borrar llaman a las rutas con el alcance', async () => {
  api.mockResolvedValue({});
  const input = { type: 'training' as const, title: 'Voleibol', date: '2026-11-02' };
  await createEvent(input);
  expect(api).toHaveBeenLastCalledWith('/me/events', { method: 'POST', body: input });
  await updateEvent('s1', { scope: 'occurrence', occurrenceDate: '2026-11-09', title: 'x' });
  expect(api).toHaveBeenLastCalledWith('/me/events/s1', { method: 'PATCH', body: { scope: 'occurrence', occurrenceDate: '2026-11-09', title: 'x' } });
  await deleteEvent('s1', 'occurrence', '2026-11-09');
  expect(api).toHaveBeenLastCalledWith('/me/events/s1?scope=occurrence&date=2026-11-09', { method: 'DELETE' });
  await deleteEvent('s1', 'series');
  expect(api).toHaveBeenLastCalledWith('/me/events/s1?scope=series', { method: 'DELETE' });
});
