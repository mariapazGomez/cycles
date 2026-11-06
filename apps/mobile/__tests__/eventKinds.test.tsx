import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Path } from 'react-native-svg';
import { EventGlyph } from '../src/components/events/EventGlyph';
import { FAMILY_COLOR, SPORT_KIND, TYPE_KIND, kindFor, sportOf } from '../src/components/events/eventKinds';
import { GLYPHS } from '../src/components/events/glyphs';

/* eslint-disable @typescript-eslint/no-require-imports */
// Módulos de Node vía require: la app móvil no trae los tipos de Node.
const fs = require('fs');
const path = require('path');
declare const __dirname: string;

test('cada tipo y cada deporte apunta a un glifo que existe y a un color de su familia', () => {
  [...Object.values(TYPE_KIND), ...Object.values(SPORT_KIND)].forEach(kind => {
    expect(GLYPHS[kind.glyph]).toMatch(/^M[\d.,-]/);
    expect(FAMILY_COLOR[kind.family]).toMatch(/^#[0-9a-f]{6}$/);
    expect(kind.label.length).toBeGreaterThan(0);
  });
});

test('reconoce el deporte por el nombre, sin tildes ni mayúsculas', () => {
  expect(sportOf('Voleibol')?.glyph).toBe('volley');
  expect(sportOf('VÓLEI de playa')?.glyph).toBe('volley');
  expect(sportOf('Fútbol')?.glyph).toBe('soccer');
  expect(sportOf('Básquetbol')?.glyph).toBe('basket');
  expect(sportOf('Natación')?.glyph).toBe('swim');
  expect(sportOf('Gimnasio')?.glyph).toBe('weights');
  expect(sportOf('Yoga')?.family).toBe('blue');
  expect(sportOf('Cumpleaños')).toBeNull();
});

test('un entrenamiento usa su deporte; los demás tipos, su ícono de tipo', () => {
  expect(kindFor({ type: 'training', title: 'Voleibol' }).glyph).toBe('volley');
  expect(kindFor({ type: 'training', title: 'Boxeo' })).toBe(SPORT_KIND.other);
  expect(kindFor({ type: 'match', title: 'Partido de liga' }).glyph).toBe('trophy');
  expect(kindFor({ type: 'match', title: 'Voleibol' }).glyph).toBe('trophy');
  expect(kindFor({ type: 'injury', title: 'Rodilla' }).family).toBe('red');
  expect(kindFor({ type: 'travel', title: 'Viaje' }).glyph).toBe('bag');
});

test('EventGlyph dibuja la perla y el glifo, y es decorativo para el lector de pantalla', () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<EventGlyph kind={SPORT_KIND.volley} size={22} />);
  });
  expect(tree.root.findAllByType(Path as never)).toHaveLength(1);
  expect(tree.root.findAll(n => n.props.accessibilityElementsHidden === true).length).toBeGreaterThan(0);
});

test('los avisos de terceros mencionan Phosphor y su licencia MIT', () => {
  const text = fs.readFileSync(path.resolve(__dirname, '../../../THIRD_PARTY_NOTICES.md'), 'utf8');
  expect(text).toContain('Phosphor Icons');
  expect(text).toContain('MIT License');
});
