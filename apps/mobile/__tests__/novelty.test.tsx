import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { MAX_NOVELTY_SLIDES, MAX_NOVELTY_TEXT, NOVELTIES, noveltyKey, pendingNovelty, visibleSlides } from '@cycles/shared';
import { NoveltyLayer } from '../src/components/novelty/NoveltyLayer';
import { NoveltyDialog } from '../src/components/novelty/NoveltyDialog';
import { canShowNovelty, NOVELTY_DELAY_MS, NOVELTY_VIEWER } from '../src/utils/novelty';
import { useAuth } from '../src/store/AuthContext';

jest.mock('../src/store/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../src/store/TourContext', () => ({ useTour: () => null }));
jest.mock('../src/hooks/useReduceMotion', () => ({ useReduceMotion: () => false }));

const authMock = useAuth as jest.Mock;
const markNewsSeen = jest.fn();
const athlete = (over: object = {}, userOver: object = {}) => ({
  status: 'signedIn',
  welcome: false,
  markNewsSeen,
  user: { id: 'u1', role: 'athlete', tourStatus: 'completed', tourNewsSeen: ['routine-blocks@1'], ...userOver },
  ...over,
});

const texts = (r: ReactTestRenderer.ReactTestRenderer) => r.root.findAll(n => (n.type as unknown) === Text).map(t => [t.props.children].flat().join(''));
const press = (r: ReactTestRenderer.ReactTestRenderer, label: string) => {
  const btn = r.root.findAll(n => n.props.accessibilityRole === 'button' && texts({ root: n } as never).includes(label))[0];
  act(() => btn.props.onPress());
};

beforeEach(() => {
  jest.useFakeTimers();
  markNewsSeen.mockClear();
});
const mounted: ReactTestRenderer.ReactTestRenderer[] = [];
const create = (el: Parameters<typeof ReactTestRenderer.create>[0]) => {
  const r = ReactTestRenderer.create(el);
  mounted.push(r);
  return r;
};
afterEach(() => {
  act(() => mounted.splice(0).forEach(r => r.unmount()));
  jest.useRealTimers();
});

describe('ficha athlete-blocks@1', () => {
  const n = NOVELTIES.find(x => x.key === 'athlete-blocks')!;
  test('es de la atleta en móvil, con 2 a 4 slides de texto corto y demostración', () => {
    expect(n).toMatchObject({ platforms: ['mobile'], roles: ['athlete'] });
    expect(n.slides.length).toBeGreaterThanOrEqual(2);
    expect(n.slides.length).toBeLessThanOrEqual(MAX_NOVELTY_SLIDES);
    n.slides.forEach(s => {
      expect(s.text.length).toBeLessThanOrEqual(MAX_NOVELTY_TEXT);
      expect(s.demo).toBeTruthy();
      expect(s.demoLabel.length).toBeGreaterThan(0);
    });
  });
  test('la atleta en móvil la ve; la coach en la web no', () => {
    expect(pendingNovelty(['routine-blocks@1'], NOVELTY_VIEWER)?.key).toBe('athlete-blocks');
    expect(pendingNovelty([], { role: 'coach', platform: 'web' })?.key).toBe('routine-blocks');
    expect(pendingNovelty(['athlete-blocks@1'], NOVELTY_VIEWER)).toBeNull();
  });
});

describe('canShowNovelty', () => {
  test('solo en una pestaña, sin guía pendiente ni cortina de bienvenida', () => {
    expect(canShowNovelty({ route: 'Today', tourPending: false, welcome: false })).toBe(true);
    expect(canShowNovelty({ route: 'ExerciseLog', tourPending: false, welcome: false })).toBe(false);
    expect(canShowNovelty({ route: undefined, tourPending: false, welcome: false })).toBe(false);
    expect(canShowNovelty({ route: 'Today', tourPending: true, welcome: false })).toBe(false);
    expect(canShowNovelty({ route: 'Today', tourPending: false, welcome: true })).toBe(false);
  });
});

describe('NoveltyLayer', () => {
  const render = (route = 'Today') => {
    let r!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      r = create(<NoveltyLayer route={route} />);
    });
    return r;
  };
  const wait = () => act(() => void jest.advanceTimersByTime(NOVELTY_DELAY_MS + 50));

  test('sale 1,5 s después, con su primera slide', () => {
    authMock.mockReturnValue(athlete());
    const r = render();
    expect(texts(r)).toEqual([]);
    wait();
    expect(texts(r)).toContain('Tu sesión ahora viene por bloques');
  });

  test('cerrar la marca como vista con su clave', () => {
    authMock.mockReturnValue(athlete());
    const r = render();
    wait();
    press(r, 'Saltar');
    expect(markNewsSeen).toHaveBeenCalledWith('athlete-blocks@1');
    expect(texts(r)).toEqual([]);
  });

  test('no sale con la guía pendiente, en una pantalla que no es pestaña, ni si ya la vio', () => {
    authMock.mockReturnValue(athlete({}, { tourStatus: 'pending' }));
    expect(texts((wait(), render()))).toEqual([]);
    authMock.mockReturnValue(athlete());
    const onExercise = render('ExerciseLog');
    wait();
    expect(texts(onExercise)).toEqual([]);
    authMock.mockReturnValue(athlete({}, { tourNewsSeen: ['athlete-blocks@1'] }));
    const seen = render();
    wait();
    expect(texts(seen)).toEqual([]);
  });

  test('una coach no la ve', () => {
    authMock.mockReturnValue(athlete({}, { role: 'coach' }));
    const r = render();
    wait();
    expect(texts(r)).toEqual([]);
  });
});

describe('NoveltyDialog', () => {
  const n = NOVELTIES.find(x => x.key === 'athlete-blocks')!;
  test('recorre las slides con Siguiente y Atrás y termina con Entendido', () => {
    const onClose = jest.fn();
    let r!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      r = create(<NoveltyDialog novelty={n} slides={visibleSlides(n, {})} onClose={onClose} />);
    });
    expect(texts(r)).toContain(n.slides[0].title);
    press(r, 'Siguiente');
    expect(texts(r)).toContain(n.slides[1].title);
    press(r, 'Atrás');
    expect(texts(r)).toContain(n.slides[0].title);
    press(r, 'Siguiente');
    press(r, 'Siguiente');
    expect(texts(r)).toContain('Entendido');
    expect(onClose).not.toHaveBeenCalled();
    press(r, 'Entendido');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('cada slide describe su demostración para el lector de pantalla', () => {
    let r!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      r = create(<NoveltyDialog novelty={n} slides={n.slides} onClose={() => {}} />);
    });
    expect(r.root.findAll(x => x.props.accessibilityRole === 'image').map(x => x.props.accessibilityLabel)).toContain(n.slides[0].demoLabel);
    expect(noveltyKey(n)).toBe('athlete-blocks@1');
  });
});
