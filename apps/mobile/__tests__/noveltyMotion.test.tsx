import React from 'react';
import { Animated, StyleSheet } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { NOVELTIES } from '@cycles/shared';
import { NoveltyDemo } from '../src/components/novelty/NoveltyDemo';

let mockReduce = false;
jest.mock('../src/hooks/useReduceMotion', () => ({ useReduceMotion: () => mockReduce }));

const slideOf = (demo: string) => NOVELTIES.flatMap(n => n.slides).find(s => s.demo === demo)!;
const DEMOS = ['athlete-blocks-group', 'athlete-blocks-fold', 'athlete-blocks-progress', 'athlete-weekly-ring', 'athlete-weekly-figures'];

type Json = ReactTestRenderer.ReactTestRendererJSON;
function opacityOf(tree: Json | Json[] | null, id: string): number | undefined {
  const nodes = Array.isArray(tree) ? tree : tree ? [tree] : [];
  for (const node of nodes) {
    if (node.props.testID === id) {
      return StyleSheet.flatten(node.props.style)?.opacity;
    }
    const found = opacityOf((node.children ?? []).filter((c): c is Json => typeof c !== 'string'), id);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
}

const mounted: ReactTestRenderer.ReactTestRenderer[] = [];
const draw = (demo: string, onRender?: () => void) => {
  let r!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    r = ReactTestRenderer.create(
      onRender ? (
        <React.Profiler id="demo" onRender={onRender}>
          <NoveltyDemo slide={slideOf(demo)} />
        </React.Profiler>
      ) : (
        <NoveltyDemo slide={slideOf(demo)} />
      ),
    );
  });
  mounted.push(r);
  return r;
};

beforeEach(() => {
  jest.useFakeTimers();
  mockReduce = false;
});
afterEach(() => {
  act(() => mounted.splice(0).forEach(r => r.unmount()));
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('demostraciones: movimiento fluido', () => {
  test.each(DEMOS)('%s: una sola animación en el hilo nativo, que se repite', demo => {
    const timing = jest.spyOn(Animated, 'timing');
    draw(demo);
    expect(timing).toHaveBeenCalledTimes(1);
    expect(timing.mock.calls[0][1]).toMatchObject({ useNativeDriver: true });
  });

  test.each(DEMOS)('%s: no se vuelve a dibujar por fase ni por fotograma', demo => {
    const onRender = jest.fn();
    draw(demo, onRender);
    const after = onRender.mock.calls.length;
    act(() => {
      jest.advanceTimersByTime(20000);
    });
    expect(onRender.mock.calls.length).toBe(after);
  });

  test.each(DEMOS)('%s: con «reducir movimiento» no anima', demo => {
    mockReduce = true;
    const timing = jest.spyOn(Animated, 'timing');
    draw(demo);
    expect(timing).not.toHaveBeenCalled();
  });

  test('con «reducir movimiento» el anillo queda en su resultado final (67 %, 2 de 3)', () => {
    mockReduce = true;
    const tree = draw('athlete-weekly-ring').toJSON();
    expect(opacityOf(tree, 'ring-67')).toBe(1);
    expect(opacityOf(tree, 'ring-0')).toBe(0);
    expect(opacityOf(tree, 'ring-33')).toBe(0);
  });

  test('con «reducir movimiento» el avance queda en «Hecho» y ninguna cifra resaltada', () => {
    mockReduce = true;
    expect(opacityOf(draw('athlete-blocks-progress').toJSON(), 'progress-2')).toBe(1);
    expect(opacityOf(draw('athlete-blocks-progress').toJSON(), 'progress-0')).toBe(0);
    const figures = draw('athlete-weekly-figures').toJSON();
    [0, 1, 2].forEach(i => expect(opacityOf(figures, `figure-${i}`)).toBe(0));
  });
});
