import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Circle } from 'react-native-svg';
import { MonthView } from '../src/components/calendar/MonthView';
import { DayDetail } from '../src/components/calendar/DayDetail';

const ev = (date: string, title: string, over = {}) => ({
  seriesId: `${title}-${date}`, date, isException: false, type: 'training' as const, sport: 'volleyball' as const, title,
  startTime: '19:00', durationMin: 90, allDay: false, intensity: 'medium' as const, notes: null, repeat: null, ...over,
});

const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAll(n => typeof n.props.children === 'string').map(n => n.props.children as string);
const byLabel = (tree: ReactTestRenderer.ReactTestRenderer, startsWith: string) =>
  tree.root.find(n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith(startsWith) && typeof n.props.onPress === 'function');

function mountMonth(over: Partial<React.ComponentProps<typeof MonthView>> = {}) {
  const handlers = { onSelect: jest.fn(), onPrev: jest.fn(), onNext: jest.fn(), onToday: jest.fn() };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <MonthView
        year={2026}
        month={11}
        today="2026-11-05"
        selected="2026-11-13"
        eventsByDay={{
          '2026-11-02': [ev('2026-11-02', 'Voleibol')],
          '2026-11-07': [ev('2026-11-07', 'Liga', { type: 'match', sport: null, allDay: true, startTime: null, durationMin: null }), ev('2026-11-07', 'Cena'), ev('2026-11-07', 'Gym')],
        }}
        sessions={[{ id: 's1', day: '2026-11-04', done: true }, { id: 's2', day: '2026-11-13', done: false }]}
        {...handlers}
        {...over}
      />,
    );
  });
  return { tree, ...handlers };
}

test('muestra el mes con su título, los días de la semana y semanas completas', () => {
  const { tree } = mountMonth();
  const t = texts(tree);
  expect(t).toContain('Noviembre 2026');
  expect(['L', 'M', 'X', 'J', 'V', 'S', 'D'].every(l => t.includes(l))).toBe(true);
  // Noviembre de 2026 ocupa 6 filas de 7 días: los días de relleno quedan deshabilitados.
  // Cada botón aparece varias veces en el árbol de pruebas (capas de componente): se cuentan por nombre.
  const days = new Map<string, boolean>();
  tree.root
    .findAll(n => typeof n.props.accessibilityLabel === 'string' && /^\S+ \d+ de \S+/.test(n.props.accessibilityLabel) && typeof n.props.onPress === 'function')
    .forEach(n => days.set(n.props.accessibilityLabel, Boolean(n.props.disabled)));
  expect(days.size).toBe(42);
  expect([...days.values()].filter(Boolean)).toHaveLength(12);
});

test('los números de los días miden 11 px', () => {
  const { tree } = mountMonth();
  const sizes = tree.root.findAll(n => n.props.style && !Array.isArray(n.props.style) && n.props.style.fontSize).map(n => n.props.style.fontSize);
  sizes.forEach((s: number) => expect(s).toBeGreaterThanOrEqual(11));
  expect(Math.min(...sizes)).toBe(11);
});

test('un día con 3 actividades muestra una perla y «+2»; uno con 1, su perla', () => {
  const { tree } = mountMonth();
  expect(texts(tree)).toContain('+2');
  const busy = byLabel(tree, 'sábado 7 de noviembre');
  expect(busy.findAllByType(Circle as never)).toHaveLength(1);
  const single = byLabel(tree, 'lunes 2 de noviembre');
  expect(single.findAllByType(Circle as never)).toHaveLength(1);
});

test('el nombre accesible de cada día dice la fecha, hoy, las actividades y las sesiones del coach', () => {
  const { tree } = mountMonth();
  expect(byLabel(tree, 'jueves 5 de noviembre').props.accessibilityLabel).toContain('hoy');
  expect(byLabel(tree, 'sábado 7 de noviembre').props.accessibilityLabel).toContain('3 actividades');
  expect(byLabel(tree, 'miércoles 4 de noviembre').props.accessibilityLabel).toContain('1 sesión del coach');
  expect(byLabel(tree, 'viernes 13 de noviembre').props.accessibilityState).toMatchObject({ selected: true });
});

test('tocar un día lo elige; las flechas y «Ir a hoy» avisan; los días de relleno no responden', () => {
  const { tree, onSelect, onPrev, onNext, onToday } = mountMonth();
  ReactTestRenderer.act(() => byLabel(tree, 'martes 3 de noviembre').props.onPress());
  expect(onSelect).toHaveBeenCalledWith('2026-11-03');
  ReactTestRenderer.act(() => byLabel(tree, 'Mes anterior').props.onPress());
  ReactTestRenderer.act(() => byLabel(tree, 'Mes siguiente').props.onPress());
  ReactTestRenderer.act(() => byLabel(tree, 'Ir a hoy').props.onPress());
  expect([onPrev, onNext, onToday].every(f => f.mock.calls.length === 1)).toBe(true);
  expect(byLabel(tree, 'lunes 26 de octubre').props.disabled).toBe(true);
});

test('con letra grande cada día muestra una sola perla y «+N»', () => {
  const { tree } = mountMonth({ compact: true, eventsByDay: { '2026-11-07': [ev('2026-11-07', 'A'), ev('2026-11-07', 'B')] } });
  expect(texts(tree)).toContain('+1');
  expect(byLabel(tree, 'sábado 7 de noviembre').findAllByType(Circle as never)).toHaveLength(1);
});

describe('DayDetail', () => {
  const mountDetail = (events = [ev('2026-11-13', 'Voleibol', { repeat: { days: [4], until: null } })], sessions = [{ id: 's2', name: 'Piernas pesadas', done: false }]) => {
    const handlers = { onOpenEvent: jest.fn(), onOpenSession: jest.fn(), onAdd: jest.fn() };
    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<DayDetail day="2026-11-13" events={events} sessions={sessions} {...handlers} />);
    });
    return { tree, ...handlers };
  };

  test('lista primero las sesiones del coach y luego las actividades, con el estado en palabras', () => {
    const { tree } = mountDetail();
    const t = texts(tree);
    expect(t).toContain('viernes 13 de noviembre');
    expect(t.indexOf('Piernas pesadas')).toBeLessThan(t.indexOf('Voleibol'));
    expect(t).toContain('Pendiente');
    expect(t).toContain('19:00 · 90 min, Media');
    expect(t).toContain('Serie');
  });

  test('tocar una sesión, una actividad o «Agregar» avisa', () => {
    const { tree, onOpenEvent, onOpenSession, onAdd } = mountDetail();
    ReactTestRenderer.act(() => byLabel(tree, 'Sesión del coach').props.onPress());
    expect(onOpenSession).toHaveBeenCalledWith('s2');
    ReactTestRenderer.act(() => byLabel(tree, 'Voleibol: Voleibol').props.onPress());
    expect(onOpenEvent).toHaveBeenCalledWith(expect.objectContaining({ title: 'Voleibol' }));
    ReactTestRenderer.act(() => byLabel(tree, 'Agregar actividad').props.onPress());
    expect(onAdd).toHaveBeenCalled();
  });

  test('un día vacío lo dice y ofrece agregar', () => {
    const { tree, onAdd } = mountDetail([], []);
    expect(texts(tree)).toContain('No hay nada este día.');
    ReactTestRenderer.act(() => byLabel(tree, 'Agregar actividad').props.onPress());
    expect(onAdd).toHaveBeenCalled();
  });
});
