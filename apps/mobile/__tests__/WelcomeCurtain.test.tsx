import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { WelcomeCurtain } from '../src/components/login/WelcomeCurtain';

jest.mock('../src/components/Logo', () => ({ Isotipo: () => null }));

test('con «Reducir movimiento» termina al instante, sin animar', async () => {
  const onDone = jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<WelcomeCurtain onDone={onDone} reduceMotion />);
  });
  expect(onDone).toHaveBeenCalledTimes(1);
  ReactTestRenderer.act(() => tree.unmount());
});

test('con animación, avisa al terminar el ciclo y no antes', async () => {
  jest.useFakeTimers();
  const onDone = jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<WelcomeCurtain onDone={onDone} reduceMotion={false} />);
  });
  expect(tree.root.findByProps({ accessibilityLabel: 'Entrando a Cycles' })).toBeTruthy();
  expect(onDone).not.toHaveBeenCalled();
  await ReactTestRenderer.act(async () => {
    jest.advanceTimersByTime(2000);
  });
  expect(onDone).toHaveBeenCalledTimes(1);
  ReactTestRenderer.act(() => tree.unmount());
  jest.useRealTimers();
});
