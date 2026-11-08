import { coachNotice } from '../src/utils/coachNotice';

const notif = (id: string, type: string, over: Record<string, unknown> = {}) => ({
  id, type, planId: 'p1', sessionId: 's1', count: 1, payload: {}, read: false,
  createdAt: '2026-11-08T10:00:00.000Z', at: '2026-11-08T10:00:00.000Z', ...over,
}) as never;

test('sin avisos relevantes no hay aviso', () => {
  expect(coachNotice([])).toBeNull();
  expect(coachNotice([notif('a', 'session_changed'), notif('b', 'session_logged'), notif('c', 'session_added', { read: true })])).toBeNull();
});

test('una sesión nueva: título singular, detalle con el nombre de la rutina y destino la sesión', () => {
  const notice = coachNotice([notif('a', 'session_added', { payload: { routineName: 'Torso B' } })]);
  expect(notice).toMatchObject({ title: 'Tu coach agregó una rutina', detail: 'Torso B', ids: ['a'], target: { kind: 'session', sessionId: 's1' } });
});

test('varios ajustes agrupados cuentan como varias rutinas', () => {
  expect(coachNotice([notif('a', 'session_added', { count: 4 })])?.title).toBe('Tu coach agregó 4 rutinas');
});

test('un ciclo nuevo dice que te asignó un ciclo; mezclado con sesiones cuenta rutinas', () => {
  expect(coachNotice([notif('a', 'plan_assigned', { payload: { planName: 'Ciclo 1' } })])).toMatchObject({ title: 'Tu coach te asignó un ciclo', detail: 'Ciclo 1' });
  expect(coachNotice([notif('a', 'plan_assigned'), notif('b', 'plan_assigned')])?.title).toBe('Tu coach te asignó 2 ciclos');
  const mixed = coachNotice([notif('a', 'plan_assigned'), notif('b', 'session_added')]);
  expect(mixed?.title).toBe('Tu coach agregó 2 rutinas');
  expect(mixed?.target).toEqual({ kind: 'plan', planId: 'p1' });
});

test('sin nombre de rutina el detalle es genérico, y el texto no lleva puntos medios', () => {
  const notice = coachNotice([notif('a', 'session_added')]);
  expect(notice?.detail).toBe('Revisa lo nuevo en tu calendario.');
  expect(`${notice?.title}${notice?.detail}`).not.toContain('·');
});
