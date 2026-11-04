import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { FloatingTabBar } from '../src/components/FloatingTabBar';
import { StyleSheet } from 'react-native';
import { Spinner } from '../src/components/Spinner';

const StyleSheetFlatten = (style: unknown) => StyleSheet.flatten(style as never);

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));

function renderBar(index: number) {
  const routes = [
    { key: 'c', name: 'Calendar' },
    { key: 't', name: 'Today' },
    { key: 's', name: 'Summary' },
    { key: 'a', name: 'Assistant' },
  ];
  const navigation = { emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <FloatingTabBar {...(({ state: { index, routes }, navigation } as unknown) as React.ComponentProps<typeof FloatingTabBar>)} />,
    );
  });
  return { tree, navigation };
}

const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAllByType('Text' as never).map(n => n.props.children);

test('la isla solo muestra íconos, pero cada opción conserva su nombre accesible', () => {
  const { tree } = renderBar(1);
  expect(texts(tree)).toEqual([]);
  const names = tree.root
    .findAll(n => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function')
    .map(n => n.props.accessibilityLabel);
  expect([...new Set(names)]).toEqual(['Calendario', 'Inicio', 'Resumen', 'Asistente']);
});

test('la isla mide lo mismo en cualquier pestaña', () => {
  const island = (index: number) => {
    const node = renderBar(index).tree.root.findAll(
      n => Array.isArray(n.props.style) && n.props.style.some((s: { width?: number }) => s && s.width === 250),
    )[0];
    return node ? StyleSheetFlatten(node.props.style) : null;
  };
  expect(island(0)).not.toBeNull();
  expect(island(0)).toEqual(island(3));
});

test('solo la opción activa queda marcada como seleccionada', () => {
  const selected = renderBar(2)
    .tree.root.findAll(n => n.props.accessibilityState && typeof n.props.onPress === 'function')
    .filter(n => n.props.accessibilityState.selected)
    .map(n => n.props.accessibilityLabel);
  expect([...new Set(selected)]).toEqual(['Resumen']);
});

test('tocar una pestaña inactiva navega a ella', () => {
  const { tree, navigation } = renderBar(1);
  const summary = tree.root.findAll(n => n.props.accessibilityLabel === 'Resumen')[0];
  ReactTestRenderer.act(() => summary.props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith('Summary');
});

test('el spinner se monta y desmonta sin errores', () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<Spinner />);
  });
  ReactTestRenderer.act(() => tree.unmount());
});

test('el área táctil de cada pestaña llena su hueco, para que el ícono quede centrado en el resaltado (CYC-229)', () => {
  const { tree } = renderBar(1);
  const pressables = tree.root.findAll(n => n.props.accessibilityRole === 'button' && typeof n.props.onPressIn === 'function');
  expect(pressables.length).toBe(4);
  pressables.forEach(p => expect(StyleSheetFlatten(p.props.style)).toMatchObject({ flex: 1 }));
});
