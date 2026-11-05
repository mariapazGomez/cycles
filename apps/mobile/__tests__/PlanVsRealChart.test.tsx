import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Circle } from 'react-native-svg';
import { PlanVsRealChart } from '../src/components/charts/PlanVsRealChart';

const data = [
  { label: 'Sem 1', plan: 60, real: 60 },
  { label: 'Sem 2', plan: 65, real: 62.5 },
];

function mount(d = data) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<PlanVsRealChart title="Sentadilla · peso" data={d} />);
  });
  // El gráfico se dibuja cuando conoce su ancho.
  ReactTestRenderer.act(() => {
    tree.root.findAll(n => typeof n.props.onLayout === 'function')[0].props.onLayout({ nativeEvent: { layout: { width: 330, height: 190 } } });
  });
  return tree;
}
const allTexts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAll(n => typeof n.props.children === 'string').map(n => n.props.children as string);

test('dice con palabras cuánto se desvió de lo planificado y lo expone al lector de pantalla', () => {
  const tree = mount();
  expect(allTexts(tree).join(' ')).toContain('Cargó 2,5 kg menos que el plan en la última sesión.');
  const root = tree.root.findAll(n => n.props.accessibilityRole === 'image')[0];
  expect(root.props.accessibilityLabel).toContain('Sem 2: plan 65 kg, cargado 62.5 kg');
});

test('todo el texto del gráfico mide 11 px o más', () => {
  const tree = mount();
  const sizes = tree.root
    .findAll(n => n.props.fontSize !== undefined)
    .map(n => Number(n.props.fontSize));
  expect(sizes.length).toBeGreaterThan(4);
  sizes.forEach(s => expect(s).toBeGreaterThanOrEqual(11));
});

test('una sola sesión se dibuja sin romperse', () => {
  expect(() => mount([{ label: 'Sem 1', plan: 60, real: 60 }])).not.toThrow();
});

test('dibuja una perla por sesión para cada serie', () => {
  const tree = mount();
  // Plan: 1 círculo por sesión; real: halo + perla por sesión.
  expect(tree.root.findAllByType(Circle as never).length).toBe(2 + 2 * 2);
});
