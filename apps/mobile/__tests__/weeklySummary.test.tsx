import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { WeekCard } from '../src/components/today/WeekCard';
import { durationLabel, effortLabel, weekPercent, weekRangeLabel, weeklyCard } from '../src/utils/weeklySummary';
import { viewScale } from '../src/utils/viewScale';

const { weeklySummaryFixture, weeklySummaryEmptyFixture } = require('../../../packages/shared/src/fixtures/weeklySummary');

let mockScale = viewScale(1, 390);
jest.mock('../src/hooks/useViewScale', () => ({ useViewScale: () => mockScale }));

const texts = (r: ReactTestRenderer.ReactTestRenderer) => r.root.findAll(n => (n.type as unknown) === Text).map(t => [t.props.children].flat().join(''));
const render = (summary: Parameters<typeof WeekCard>[0]['summary']) => {
  let r!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    r = ReactTestRenderer.create(<WeekCard summary={summary} />);
  });
  return r;
};

describe('textos de la semana', () => {
  test('rango: «9 al 15 nov» y, si cruza de mes, «30 nov al 6 dic»', () => {
    expect(weekRangeLabel('2026-11-09', '2026-11-15')).toBe('9 al 15 nov');
    expect(weekRangeLabel('2026-11-30', '2026-12-06')).toBe('30 nov al 6 dic');
  });
  test('porcentaje: hechas sobre planeadas, sin pasarse de 100', () => {
    expect(weekPercent({ sessionsDone: 2, sessionsPlanned: 3 })).toBe(67);
    expect(weekPercent({ sessionsDone: 0, sessionsPlanned: 3 })).toBe(0);
    expect(weekPercent({ sessionsDone: 4, sessionsPlanned: 3 })).toBe(100);
    expect(weekPercent({ sessionsDone: 0, sessionsPlanned: 0 })).toBe(0);
    expect(weekPercent({ sessionsDone: 1, sessionsPlanned: 0 })).toBe(100);
  });
  test('tiempo y esfuerzo: formato corto y «Sin dato» si faltan', () => {
    expect(durationLabel(95)).toBe('1 h 35 min');
    expect(durationLabel(45)).toBe('45 min');
    expect(durationLabel(120)).toBe('2 h');
    expect(durationLabel(null)).toBe('Sin dato');
    expect(effortLabel(6.5)).toBe('6,5');
    expect(effortLabel(7)).toBe('7');
    expect(effortLabel(null)).toBe('Sin dato');
  });
  test('contrato: el resumen de ejemplo de la API produce la tarjeta esperada', () => {
    expect(weeklyCard(weeklySummaryFixture)).toMatchObject({ range: '9 al 15 nov', percent: 67, sessions: '2 de 3', time: '1 h 35 min', effort: '6,5' });
    expect(weeklyCard(weeklySummaryFixture)!.spoken).toBe(
      'Esta semana, 9 al 15 de noviembre: 2 de 3 sesiones, tiempo entrenado 1 hora 35 minutos, esfuerzo medio 6,5',
    );
  });
  test('una semana sin sesiones (o sin resumen) no tiene tarjeta', () => {
    expect(weeklyCard(weeklySummaryEmptyFixture)).toBeNull();
    expect(weeklyCard(null)).toBeNull();
  });
});

describe('WeekCard', () => {
  beforeEach(() => {
    mockScale = viewScale(1, 390);
  });
  test('muestra título, rango, porcentaje y las tres cifras con su etiqueta', () => {
    const t = texts(render(weeklySummaryFixture));
    expect(t).toEqual(expect.arrayContaining(['Esta semana', '9 al 15 nov', '67%', 'Sesiones', '2 de 3', 'Tiempo entrenado', '1 h 35 min', 'Esfuerzo medio', '6,5']));
  });
  test('sin tiempo ni esfuerzo registrados dice «Sin dato»', () => {
    const t = texts(render({ ...weeklySummaryFixture, minutesTrained: null, averageSrpe: null }));
    expect(t.filter(x => x === 'Sin dato')).toHaveLength(2);
  });
  test('se lee como una sola frase', () => {
    const card = render(weeklySummaryFixture).root.findAll(n => n.props.accessibilityRole === 'summary')[0];
    expect(card.props.accessibilityLabel).toContain('2 de 3 sesiones');
  });
  test('con letra grande el anillo crece (hasta 100) y las cifras van debajo', () => {
    mockScale = viewScale(2, 390);
    const r = render(weeklySummaryFixture);
    const svg = r.root.findAll(n => n.props.width === 100 && n.props.height === 100);
    expect(svg.length).toBeGreaterThan(0);
    expect(texts(r)).toContain('6,5');
  });
  test('sin semana no se dibuja nada', () => {
    expect(render(weeklySummaryEmptyFixture).toJSON()).toBeNull();
  });
});
