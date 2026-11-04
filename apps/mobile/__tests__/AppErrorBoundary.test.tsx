import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { AppErrorBoundary } from '../src/components/AppErrorBoundary';
import { reportError } from '../src/services/crashReporting';

jest.mock('../src/services/crashReporting', () => ({ reportError: jest.fn() }));

let broken = true;
function Screen() {
  if (broken) {
    throw new Error('falló al dibujar');
  }
  return <Text>Pantalla sana</Text>;
}

const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAll(n => typeof n.props.children === 'string').map(n => n.props.children as string);

let errorSpy: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  broken = true;
  // React escribe el error en consola al capturarlo: se silencia en la prueba.
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => errorSpy.mockRestore());

test('una pantalla que falla muestra el aviso en vez de quedar en blanco y registra el error', () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <AppErrorBoundary>
        <Screen />
      </AppErrorBoundary>,
    );
  });
  expect(texts(tree)).toContain('Algo salió mal');
  expect(texts(tree)).toContain('Reintentar');
  expect(reportError).toHaveBeenCalledTimes(1);
  expect((reportError as jest.Mock).mock.calls[0][0]).toEqual(new Error('falló al dibujar'));
  expect(typeof (reportError as jest.Mock).mock.calls[0][1]).toBe('string');
});

test('Reintentar vuelve a dibujar la pantalla cuando el problema ya pasó', () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <AppErrorBoundary>
        <Screen />
      </AppErrorBoundary>,
    );
  });
  broken = false;
  const retry = tree.root.find(n => n.props.accessibilityLabel === 'Reintentar' && typeof n.props.onPress === 'function');
  ReactTestRenderer.act(() => retry.props.onPress());
  expect(texts(tree)).toContain('Pantalla sana');
  expect(texts(tree)).not.toContain('Algo salió mal');
});

test('sin errores no cambia nada', () => {
  broken = false;
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <AppErrorBoundary>
        <Screen />
      </AppErrorBoundary>,
    );
  });
  expect(texts(tree)).toContain('Pantalla sana');
  expect(texts(tree)).not.toContain('Algo salió mal');
  expect(reportError).not.toHaveBeenCalled();
});
