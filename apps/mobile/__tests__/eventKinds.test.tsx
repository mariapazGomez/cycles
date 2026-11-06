import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Path } from 'react-native-svg';
import { EventGlyph } from '../src/components/events/EventGlyph';
import { FAMILY_COLOR, SPORT_KIND, TYPE_KIND, kindFor, sportFromTitle } from '../src/components/events/eventKinds';
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

test('respaldo: reconoce el deporte por el nombre, sin tildes ni mayúsculas', () => {
  expect(sportFromTitle('Voleibol')).toBe('volleyball');
  expect(sportFromTitle('VÓLEI de playa')).toBe('volleyball');
  expect(sportFromTitle('Fútbol')).toBe('soccer');
  expect(sportFromTitle('Básquetbol')).toBe('basketball');
  expect(sportFromTitle('Natación')).toBe('swimming');
  expect(sportFromTitle('Gimnasio')).toBe('weights');
  expect(sportFromTitle('Cumpleaños')).toBeNull();
});

test('el campo sport manda sobre el nombre; sin sport vale el respaldo por nombre; sin nada, «Otro deporte»', () => {
  expect(kindFor({ type: 'training', sport: 'swimming', title: 'Voleibol' }).glyph).toBe('swim');
  expect(kindFor({ type: 'training', sport: null, title: 'Voleibol' }).glyph).toBe('volley');
  expect(kindFor({ type: 'training', title: 'Fútbol' }).glyph).toBe('soccer');
  expect(kindFor({ type: 'training', sport: null, title: 'Boxeo' })).toBe(SPORT_KIND.other);
  expect(kindFor({ type: 'training', sport: 'other', title: 'Vóley playa' })).toBe(SPORT_KIND.other);
});

test('los demás tipos usan su ícono de tipo aunque traigan un deporte', () => {
  expect(kindFor({ type: 'match', sport: 'volleyball', title: 'Partido de liga' }).glyph).toBe('trophy');
  expect(kindFor({ type: 'injury', title: 'Rodilla' }).family).toBe('red');
  expect(kindFor({ type: 'travel', title: 'Viaje' }).glyph).toBe('bag');
  expect(kindFor({ type: 'rest', title: 'Caminata' }).family).toBe('blue');
});

test('EventGlyph dibuja la perla y el glifo, y es decorativo para el lector de pantalla', () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<EventGlyph kind={SPORT_KIND.volleyball} size={22} />);
  });
  expect(tree.root.findAllByType(Path as never)).toHaveLength(1);
  expect(tree.root.findAll(n => n.props.accessibilityElementsHidden === true).length).toBeGreaterThan(0);
});

test('los avisos de terceros mencionan Phosphor y su licencia MIT', () => {
  const text = fs.readFileSync(path.resolve(__dirname, '../../../THIRD_PARTY_NOTICES.md'), 'utf8');
  expect(text).toContain('Phosphor Icons');
  expect(text).toContain('MIT License');
});
