import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { EVENTS_ERROR, useEvents } from '../src/hooks/useEvents';
import { fetchEvents } from '../src/services/eventsApi';

jest.mock('../src/services/eventsApi', () => ({ fetchEvents: jest.fn() }));
const fetchMock = fetchEvents as jest.Mock;

type Result = ReturnType<typeof useEvents>;
function mount(from: string, to: string) {
  const ref: { current: Result | null; tree: ReactTestRenderer.ReactTestRenderer | null } = { current: null, tree: null };
  function Probe({ f, t }: { f: string; t: string }) {
    ref.current = useEvents(f, t);
    return null;
  }
  return {
    ref,
    render: async (f = from, t = to) => {
      await ReactTestRenderer.act(async () => {
        if (ref.tree) {
          ref.tree.update(<Probe f={f} t={t} />);
        } else {
          ref.tree = ReactTestRenderer.create(<Probe f={f} t={t} />);
        }
      });
    },
  };
}

beforeEach(() => fetchMock.mockReset());

const event = (date: string) => ({ seriesId: 's', date, isException: false, type: 'training', title: 'x', startTime: null, durationMin: null, allDay: true, intensity: null, notes: null, repeat: null });

test('carga las actividades del rango', async () => {
  fetchMock.mockResolvedValue([event('2026-11-03')]);
  const h = mount('2026-11-02', '2026-11-08');
  await h.render();
  expect(fetchMock).toHaveBeenCalledWith('2026-11-02', '2026-11-08');
  expect(h.ref.current).toMatchObject({ loading: false, error: null });
  expect(h.ref.current?.events).toHaveLength(1);
});

test('si falla, el error es propio y reload lo reintenta', async () => {
  fetchMock.mockRejectedValueOnce(new Error('sin red'));
  const h = mount('2026-11-02', '2026-11-08');
  await h.render();
  expect(h.ref.current?.error).toBe(EVENTS_ERROR);
  fetchMock.mockResolvedValueOnce([event('2026-11-03')]);
  await ReactTestRenderer.act(async () => h.ref.current?.reload());
  expect(h.ref.current).toMatchObject({ error: null, loading: false });
  expect(h.ref.current?.events).toHaveLength(1);
});

test('al cambiar de rango descarta la respuesta vieja que llega tarde', async () => {
  let resolveOld: (v: unknown[]) => void = () => {};
  fetchMock.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
  fetchMock.mockResolvedValueOnce([event('2026-11-10')]);
  const h = mount('2026-11-02', '2026-11-08');
  await h.render();
  await h.render('2026-11-09', '2026-11-15');
  expect(h.ref.current?.events.map(e => e.date)).toEqual(['2026-11-10']);
  await ReactTestRenderer.act(async () => resolveOld([event('2026-11-03')]));
  expect(h.ref.current?.events.map(e => e.date)).toEqual(['2026-11-10']);
});
