import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { FloatingTabBar } from '../src/components/FloatingTabBar';
import { Spinner } from '../src/components/Spinner';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));

function renderBar(index: number) {
  const routes = [
    { key: 'c', name: 'Calendar' },
    { key: 't', name: 'Today' },
    { key: 's', name: 'Summary' },
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

test('solo la opción activa muestra su etiqueta', () => {
  expect(texts(renderBar(1).tree)).toEqual(['Inicio']);
  expect(texts(renderBar(0).tree)).toEqual(['Calendario']);
  expect(texts(renderBar(2).tree)).toEqual(['Resumen']);
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
