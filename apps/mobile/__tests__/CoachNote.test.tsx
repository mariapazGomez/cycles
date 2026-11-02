import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { CoachNote } from '../src/components/CoachNote';

const render = (note: string | null | undefined, compact?: boolean) => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<CoachNote note={note} compact={compact} />);
  });
  return tree;
};
// Solo los <Text> reales (findAll por children cuenta también el nodo nativo y repite).
const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAll(n => (n.type as unknown) === Text).map(n => n.props.children as string);

test('sin nota (vacía, nula o indefinida) no dibuja nada', () => {
  for (const note of [null, undefined, '']) {
    expect(render(note).toJSON()).toBeNull();
  }
});

test('con nota muestra el título y el texto completo, con la nota como nombre accesible', () => {
  const tree = render('Baja lento y cuida el hombro.\nSi duele, avísame.');
  expect(texts(tree)).toEqual(['Nota de tu coach', 'Baja lento y cuida el hombro.\nSi duele, avísame.']);
  expect(tree.root.findAll(n => n.props.accessibilityLabel === 'Nota de tu coach: Baja lento y cuida el hombro.\nSi duele, avísame.').length).toBeGreaterThan(0);
});

test('en listas apretadas usa la versión compacta', () => {
  const normal = render('x');
  const compact = render('x', true);
  expect(JSON.stringify(compact.toJSON())).not.toEqual(JSON.stringify(normal.toJSON()));
});
