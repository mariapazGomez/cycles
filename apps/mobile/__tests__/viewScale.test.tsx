import React from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { Circle } from 'react-native-svg';
import { MonthView } from '../src/components/calendar/MonthView';
import { WeekDatesView } from '../src/components/calendar/WeekDatesView';
import { DayDetail } from '../src/components/calendar/DayDetail';
import { CoachNotice } from '../src/components/today/CoachNotice';
import { TodayAlso } from '../src/components/today/TodayAlso';
import { applyFontScaleLimit } from '../src/theme/typography';
import { scaledIcon, scaledSpace, touchHeight, viewScale } from '../src/utils/viewScale';

let mockScale = viewScale(1, 390);
jest.mock('../src/hooks/useViewScale', () => ({ useViewScale: () => mockScale }));

const ev = (date: string, title: string) => ({
  seriesId: title, date, isException: false, type: 'training' as const, sport: 'volleyball' as const, title,
  startTime: '19:00', durationMin: 60, allDay: false, intensity: 'medium' as const, notes: null, repeat: null,
});

test('viewScale acota la letra a 0,85–2 y marca «grande» desde ×1,3 o ancho menor a 340', () => {
  expect(viewScale(0.5, 390).font).toBe(0.85);
  expect(viewScale(3, 390).font).toBe(2);
  expect(viewScale(Number.NaN, 390).font).toBe(1);
  expect(viewScale(1, 390).big).toBe(false);
  expect(viewScale(1.29, 390).big).toBe(false);
  expect(viewScale(1.3, 390).big).toBe(true);
  expect(viewScale(1, 320).big).toBe(true);
  expect(viewScale(1, 340).big).toBe(false);
});

test('las perlas escalan con la letra pero se detienen en ×1,35 y no bajan del tamaño base', () => {
  expect(viewScale(0.85, 390).icon).toBe(1);
  expect(viewScale(1.2, 390).icon).toBe(1.2);
  expect(viewScale(2, 390).icon).toBe(1.35);
  expect(scaledIcon(20, viewScale(2, 390))).toBe(27);
  expect(scaledIcon(20, viewScale(1, 390))).toBe(20);
});

test('los espacios respiran con la letra y las zonas táctiles van de 44 a 56 pt', () => {
  expect(scaledSpace(10, viewScale(2, 390))).toBe(20);
  expect(touchHeight(viewScale(0.85, 390))).toBe(44);
  expect(touchHeight(viewScale(1, 390))).toBe(44);
  expect(touchHeight(viewScale(1.2, 390))).toBe(53);
  expect(touchHeight(viewScale(2, 390))).toBe(56);
});

test('applyFontScaleLimit pone un tope de ×2 al texto de la app y conserva el resto de sus propiedades', () => {
  const text = Text as unknown as { defaultProps?: Record<string, unknown> };
  const input = TextInput as unknown as { defaultProps?: Record<string, unknown> };
  const before = { text: text.defaultProps, input: input.defaultProps };
  text.defaultProps = { allowFontScaling: true };
  applyFontScaleLimit();
  expect(text.defaultProps).toMatchObject({ allowFontScaling: true, maxFontSizeMultiplier: 2 });
  expect(input.defaultProps).toMatchObject({ maxFontSizeMultiplier: 2 });
  text.defaultProps = before.text;
  input.defaultProps = before.input;
});

function render(node: React.ReactElement) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(node as never);
  });
  return tree;
}
const noop = () => {};
const monthProps = {
  year: 2026, month: 11, today: '2026-11-05', selected: '2026-11-07',
  eventsByDay: { '2026-11-07': [ev('2026-11-07', 'A'), ev('2026-11-07', 'B')] },
  sessions: [], onSelect: noop, onPrev: noop, onNext: noop, onToday: noop,
};
const cellOf = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.find(n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('sábado 7 de noviembre') && typeof n.props.onPress === 'function');

describe('mes con letra y ancho distintos', () => {
  test('letra normal, 390 pt: dos perlas de 19 y celdas de 54', () => {
    mockScale = viewScale(1, 390);
    const cell = cellOf(render(<MonthView {...monthProps} />));
    const circles = cell.findAllByType(Circle as never);
    expect(circles).toHaveLength(2);
    expect(circles[0].props.r).toBe(9.5);
    expect(StyleSheet.flatten(cell.props.style).minHeight).toBe(54);
  });

  test('letra ×2: una sola perla y «+1», perla de 26 y celda más alta; el texto sigue escalando', () => {
    mockScale = viewScale(2, 390);
    const tree = render(<MonthView {...monthProps} />);
    const cell = cellOf(tree);
    const circles = cell.findAllByType(Circle as never);
    expect(circles).toHaveLength(1);
    expect(circles[0].props.r).toBe(13);
    expect(StyleSheet.flatten(cell.props.style).minHeight).toBe(73);
    expect(tree.root.findAll(n => n.props.children === '+1').length).toBeGreaterThan(0);
  });

  test('pantalla de 320 pt con letra normal: también una sola perla (reorganiza)', () => {
    mockScale = viewScale(1, 320);
    const cell = cellOf(render(<MonthView {...monthProps} />));
    expect(cell.findAllByType(Circle as never)).toHaveLength(1);
  });
});

describe('zonas táctiles de 44 pt con cualquier escala', () => {
  const touchables = (tree: ReactTestRenderer.ReactTestRenderer) =>
    tree.root.findAll(n => typeof n.props.onPress === 'function' && n.props.style !== undefined && n.props.accessibilityRole === 'button');
  const sizeOf = (style: unknown) => {
    const flat = StyleSheet.flatten(style as never) as { minHeight?: number; height?: number };
    return flat.minHeight ?? flat.height;
  };

  test.each([[1, 390], [2, 390], [0.85, 320], [1.3, 430]])('letra ×%s, ancho %s', (font, width) => {
    mockScale = viewScale(font, width);
    const trees = [
      render(<MonthView {...monthProps} />),
      render(
        <WeekDatesView anchor="2026-11-05" today="2026-11-05" eventsByDay={{}} sessionsByDay={{}} onPrev={noop} onNext={noop} onToday={noop} onOpenEvent={noop} onOpenSession={noop} onAdd={noop} />,
      ),
      render(<DayDetail day="2026-11-05" events={[ev('2026-11-05', 'Voleibol')]} sessions={[{ id: 's', name: 'Torso B', done: false }]} onOpenEvent={noop} onOpenSession={noop} onAdd={noop} />),
      render(<CoachNotice notice={{ title: 'Tu coach agregó una rutina', detail: 'Torso B', ids: ['a'], target: { kind: 'none' } }} onOpen={noop} />),
      render(<TodayAlso events={[ev('2026-11-05', 'Voleibol')]} onOpen={noop} />),
    ];
    trees.flatMap(touchables).forEach(node => {
      const size = sizeOf(node.props.style);
      // Los días del mes miden lo mismo que su celda; todo lo demás, 44 o más.
      if (size !== undefined) {
        expect(size).toBeGreaterThanOrEqual(44);
      }
    });
  });

  test('el aviso del coach apila la perla y el texto con letra grande y mide 56 pt o más', () => {
    mockScale = viewScale(2, 390);
    const tree = render(<CoachNotice notice={{ title: 'Tu coach agregó una rutina', detail: 'Torso B', ids: ['a'], target: { kind: 'none' } }} onOpen={noop} />);
    const style = StyleSheet.flatten(tree.root.findAll(n => typeof n.props.onPress === 'function')[0].props.style) as { minHeight: number; flexDirection: string };
    expect(style.flexDirection).toBe('column');
    expect(style.minHeight).toBeGreaterThanOrEqual(56);
    mockScale = viewScale(1, 390);
    const normal = render(<CoachNotice notice={{ title: 'Tu coach agregó una rutina', detail: 'Torso B', ids: ['a'], target: { kind: 'none' } }} onOpen={noop} />);
    const normalStyle = StyleSheet.flatten(normal.root.findAll(n => typeof n.props.onPress === 'function')[0].props.style) as { minHeight: number; flexDirection: string };
    expect(normalStyle.flexDirection).toBe('row');
    expect(normalStyle.minHeight).toBeGreaterThanOrEqual(56);
  });
});
