import React from 'react';
import { AccessibilityInfo } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { BrandSplash } from '../src/components/BrandSplash';
import { ScreenHeader } from '../src/components/ScreenHeader';

// Con «reducir movimiento» la introducción se salta: el logo queda quieto y
// la app entra en cuanto la sesión esté lista.
describe('BrandSplash', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  async function mount(ready: boolean, onFinish: () => void) {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<BrandSplash ready={ready} onFinish={onFinish} />);
    });
    return renderer;
  }

  test('entra cuando la sesión está lista', async () => {
    const onFinish = jest.fn();
    await mount(true, onFinish);
    expect(onFinish).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  test('espera mientras la sesión carga y entra al terminar', async () => {
    const onFinish = jest.fn();
    const renderer = await mount(false, onFinish);
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(onFinish).not.toHaveBeenCalled();
    await act(async () => {
      renderer.update(<BrandSplash ready onFinish={onFinish} />);
    });
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});

describe('ScreenHeader', () => {
  test('muestra el título y los controles de la derecha', () => {
    const { Text } = require('react-native');
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(<ScreenHeader title="Hoy" right={<Text>campana</Text>} />);
    });
    const texts = renderer.root.findAllByType(Text).map(t => t.props.children);
    expect(texts).toEqual(['Hoy', 'campana']);
  });
});
