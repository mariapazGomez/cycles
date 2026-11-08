import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Circle, Path } from 'react-native-svg';
import { Pearl } from '../src/components/pearl/Pearl';
import { PEARL_KINDS } from '../src/components/pearl/kinds';
import { GLYPHS } from '../src/components/pearl/glyphs';
import { colors, pearlColors } from '../src/theme/colors';

// Módulos de Node vía require: la app móvil no trae los tipos de Node.
const fs = require('fs');
const path = require('path');
declare const __dirname: string;

const kinds = Object.entries(PEARL_KINDS);

test('cada perla apunta a un glifo que existe, a una familia de color y a un nombre', () => {
  kinds.forEach(([, kind]) => {
    expect(GLYPHS[kind.glyph]).toMatch(/^M[\d.,-]/);
    expect(pearlColors[kind.family]).toMatch(/^#[0-9a-f]{6}$/);
    expect(kind.label.length).toBeGreaterThan(0);
  });
});

test('regla: el azul es solo de la app, ninguna perla va en azul', () => {
  const appBlues = [colors.blue, colors.brand, colors.blueHover, '#2b6fe6'].map(c => c.toLowerCase());
  Object.values(pearlColors).forEach(color => expect(appBlues).not.toContain(color));
  expect(Object.keys(pearlColors)).not.toContain('blue');
});

test('regla: el verde es solo la fuerza del coach; lo del atleta va en naranja, violeta, tinta, gris o rojo', () => {
  const green = kinds.filter(([, kind]) => kind.family === 'green').map(([id]) => id);
  expect(green).toEqual(['coachStrength']);
  // Las pesas del atleta ya no van en verde.
  expect(PEARL_KINDS.weights.family).toBe('orange');
  // El descanso ya no es azul.
  expect(PEARL_KINDS.rest.family).toBe('violet');
  expect(PEARL_KINDS.yoga.family).toBe('violet');
  expect(PEARL_KINDS.match.family).toBe('ink');
  expect(PEARL_KINDS.travel.family).toBe('gray');
  expect(PEARL_KINDS.injury.family).toBe('red');
  (['volleyball', 'soccer', 'basketball', 'running', 'cycling', 'swimming', 'otherSport'] as const).forEach(id =>
    expect(PEARL_KINDS[id].family).toBe('orange'),
  );
});

test('la perla dibuja el círculo y el glifo blanco, y es decorativa para el lector de pantalla', () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<Pearl kind={PEARL_KINDS.volleyball} size={30} />);
  });
  const circles = tree.root.findAllByType(Circle as never);
  expect(circles).toHaveLength(1);
  expect(circles[0].props).toMatchObject({ r: 15, fill: pearlColors.orange });
  const glyph = tree.root.findAllByType(Path as never)[0];
  expect(glyph.props.fill).toBe('#ffffff');
  expect(tree.root.findAll(n => n.props.accessibilityElementsHidden === true).length).toBeGreaterThan(0);
});

test('con anillo suma un círculo exterior de 2 px y 2 px de separación', () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<Pearl kind={PEARL_KINDS.match} size={30} ring />);
  });
  const circles = tree.root.findAllByType(Circle as never);
  expect(circles).toHaveLength(2);
  const svg = tree.root.find(n => n.props.width !== undefined && n.props.height !== undefined && n.props.viewBox === undefined && n.props.accessibilityElementsHidden);
  expect(svg.props.width).toBe(38);
  expect(circles[0].props).toMatchObject({ fill: 'none', stroke: pearlColors.ink, strokeWidth: 2 });
});

test('el pictograma ocupa el 58 % del diámetro, centrado', () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<Pearl kind={PEARL_KINDS.travel} size={100} />);
  });
  const glyph = tree.root.findAllByType(Path as never)[0];
  expect(glyph.props.transform).toBe('translate(21 21) scale(0.227)');
});

test('sin valores sueltos: los componentes de la perla no escriben colores hex (salen de theme/colors)', () => {
  const dir = path.resolve(__dirname, '../src/components/pearl');
  fs.readdirSync(dir)
    .filter((file: string) => file !== 'glyphs.ts' && /\.tsx?$/.test(file))
    .forEach((file: string) => {
      expect(fs.readFileSync(path.join(dir, file), 'utf8')).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });
});

test('los avisos de terceros mencionan Phosphor y su licencia MIT, y siguen marcados para verificar', () => {
  const text = fs.readFileSync(path.resolve(__dirname, '../../../THIRD_PARTY_NOTICES.md'), 'utf8');
  expect(text).toContain('Phosphor Icons');
  expect(text).toContain('MIT License');
  expect(text).toContain('apps/mobile/src/components/pearl/glyphs.ts');
});

test('sin valores sueltos: las vistas de calendario y actividades tampoco escriben colores hex', () => {
  ['events', 'calendar'].forEach(folder => {
    const dir = path.resolve(__dirname, '../src/components', folder);
    fs.readdirSync(dir)
      .filter((file: string) => /\.tsx?$/.test(file))
      .forEach((file: string) => {
        expect(`${folder}/${file}: ${fs.readFileSync(path.join(dir, file), 'utf8').match(/#[0-9a-fA-F]{3,8}\b/g)}`).toBe(`${folder}/${file}: null`);
      });
  });
});
