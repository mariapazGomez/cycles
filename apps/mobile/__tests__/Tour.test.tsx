import React from 'react';
import { View } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { TourContext, TourProvider, useTour } from '../src/store/TourContext';
import { TourAnchor } from '../src/components/tour/TourAnchor';
import { TourOverlay } from '../src/components/tour/TourOverlay';
import { ProfileAvatar } from '../src/components/ProfileAvatar';
import { useAuth } from '../src/store/AuthContext';

jest.mock('../src/store/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const authMock = useAuth as jest.Mock;
const setTourStatus = jest.fn();

const athlete = (tourStatus?: string, extra: object = {}) => ({
  status: 'signedIn',
  welcome: false,
  setTourStatus,
  logout: jest.fn(),
  user: { id: 'u1', role: 'athlete', name: 'Ana Pérez', email: 'ana@x.cl', tourStatus },
  ...extra,
});

let tour: ReturnType<typeof useTour>;
function Probe() {
  tour = useTour();
  return null;
}

type Instance = ReactTestRenderer.ReactTestRenderer;
const mounted: Instance[] = [];

// En pruebas la View es una simulación sin diseño real: cada una devuelve una medida fija.
const viewPrototype = (View as unknown as { prototype: { measureInWindow?: unknown } }).prototype;
const originalMeasure = viewPrototype.measureInWindow;
beforeAll(() => {
  viewPrototype.measureInWindow = (cb: (x: number, y: number, w: number, h: number) => void) => cb(20, 600, 200, 48);
});
afterAll(() => {
  viewPrototype.measureInWindow = originalMeasure;
});

async function mount(route: string | undefined, onGoToday = jest.fn(), children: React.ReactNode = null) {
  let tree!: Instance;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <TourProvider route={route} onGoToday={onGoToday}>
        <Probe />
        {children}
      </TourProvider>,
    );
  });
  mounted.push(tree);
  return tree;
}

const rerender = async (tree: Instance, route: string | undefined, children: React.ReactNode = null) => {
  await ReactTestRenderer.act(async () => {
    tree.update(
      <TourProvider route={route} onGoToday={jest.fn()}>
        <Probe />
        {children}
      </TourProvider>,
    );
  });
};

const texts = (tree: Instance) =>
  tree.root.findAll(n => typeof n.props.children === 'string').map(n => n.props.children as string);

beforeEach(() => {
  jest.clearAllMocks();
  authMock.mockReturnValue(athlete('pending'));
});
afterEach(() => {
  mounted.splice(0).forEach(t => ReactTestRenderer.act(() => t.unmount()));
});

describe('cuándo aparece la guía', () => {
  test('una atleta con la guía pendiente la ve en Inicio', async () => {
    await mount('Today');
    expect(tour?.visible).toBe(true);
    expect(tour?.step).toBe(0);
  });

  test.each(['completed', 'skipped', undefined])('con tourStatus %s no aparece', async status => {
    authMock.mockReturnValue(athlete(status));
    await mount('Today');
    expect(tour?.visible).toBe(false);
  });

  test('no aparece con la bienvenida activa, sin sesión ni para un coach', async () => {
    authMock.mockReturnValue(athlete('pending', { welcome: true }));
    await mount('Today');
    expect(tour?.visible).toBe(false);

    authMock.mockReturnValue(athlete('pending', { status: 'signedOut' }));
    await mount('Today');
    expect(tour?.visible).toBe(false);

    authMock.mockReturnValue(athlete('pending', { user: { id: 'c1', role: 'coach', tourStatus: 'pending' } }));
    await mount('Today');
    expect(tour?.visible).toBe(false);
  });

  test('la primera marca solo se ve en Inicio y fuera de las pestañas no se dibuja nada', async () => {
    const calendar = await mount('Calendar');
    expect(tour?.visible).toBe(false);
    const exercise = await mount('ExerciseLog');
    expect(tour?.visible).toBe(false);
    expect(calendar).toBeTruthy();
    expect(exercise).toBeTruthy();
  });
});

describe('avance entre marcas', () => {
  test('abrir un ejercicio (tocar el botón real) pasa a la marca 2', async () => {
    const tree = await mount('Today');
    await rerender(tree, 'ExerciseLog');
    expect(tour?.step).toBe(1);
    await rerender(tree, 'Today');
    expect(tour?.visible).toBe(true);
  });

  test('tocar la pestaña Calendario pasa a la marca 3 y Resumen termina la guía', async () => {
    const tree = await mount('Today');
    await ReactTestRenderer.act(async () => tour?.next());
    expect(tour?.step).toBe(1);
    await rerender(tree, 'Calendar');
    expect(tour?.step).toBe(2);
    expect(setTourStatus).not.toHaveBeenCalled();
    await rerender(tree, 'Summary');
    expect(setTourStatus).toHaveBeenCalledWith('completed');
    expect(tour?.step).toBe(0);
  });

  test('Siguiente recorre las tres marcas y la última marca la guía como completada', async () => {
    await mount('Today');
    await ReactTestRenderer.act(async () => tour?.next());
    await ReactTestRenderer.act(async () => tour?.next());
    expect(tour?.step).toBe(2);
    await ReactTestRenderer.act(async () => tour?.next());
    expect(setTourStatus).toHaveBeenCalledWith('completed');
  });

  test('Saltar la guarda como saltada y «Cómo usar Cycles» la pide de nuevo y vuelve a Inicio', async () => {
    const onGoToday = jest.fn();
    await mount('Calendar', onGoToday);
    await ReactTestRenderer.act(async () => tour?.skip());
    expect(setTourStatus).toHaveBeenCalledWith('skipped');
    await ReactTestRenderer.act(async () => tour?.restart());
    expect(setTourStatus).toHaveBeenLastCalledWith('pending');
    expect(onGoToday).toHaveBeenCalled();
    expect(tour?.step).toBe(0);
  });
});

describe('capa de la guía', () => {
  const startButton = (
    <TourAnchor id="start" radius={999} label="Iniciar rutina">
      <View />
    </TourAnchor>
  );

  test('señala el botón real con su nombre, con halo que no bloquea toques', async () => {
    const tree = await mount('Today', jest.fn(), (
      <>
        {startButton}
        <TourOverlay />
      </>
    ));
    const t = texts(tree);
    expect(t).toContain('Paso 1 de 3');
    expect(t).toContain('Toca Iniciar rutina cuando vayas a entrenar.');
    expect(t).toContain('Siguiente');
    expect(t).toContain('Saltar');
    const halo = tree.root.findAll(n => n.props.pointerEvents === 'none' && n.props.style && JSON.stringify(n.props.style).includes('rgba(48, 128, 252, 0.10)'));
    expect(halo.length).toBeGreaterThan(0);
  });

  test('sin sesión señala la tarjeta vacía con otro texto', async () => {
    const tree = await mount('Today', jest.fn(), (
      <>
        <TourAnchor id="todayEmpty" radius={18}>
          <View />
        </TourAnchor>
        <TourOverlay />
      </>
    ));
    expect(texts(tree)).toContain('Aquí aparecerá tu sesión de hoy.');
  });

  test('las marcas 2 y 3 piden tocar la pestaña y la última ofrece «Listo»', async () => {
    const children = (
      <>
        <TourAnchor id="tab:Calendar" radius={21}>
          <View />
        </TourAnchor>
        <TourAnchor id="tab:Summary" radius={21}>
          <View />
        </TourAnchor>
        <TourOverlay />
      </>
    );
    const tree = await mount('Today', jest.fn(), children);
    await ReactTestRenderer.act(async () => tour?.next());
    expect(texts(tree)).toContain('Toca Calendario.');
    expect(texts(tree)).toContain('Paso 2 de 3');
    await ReactTestRenderer.act(async () => tour?.next());
    expect(texts(tree)).toContain('Toca Resumen.');
    expect(texts(tree)).toContain('Listo');
  });

  test('Saltar desde el globo guarda la guía como saltada', async () => {
    const tree = await mount('Today', jest.fn(), (
      <>
        {startButton}
        <TourOverlay />
      </>
    ));
    const skip = tree.root.find(n => n.props.accessibilityLabel === 'Saltar la guía' && typeof n.props.onPress === 'function');
    await ReactTestRenderer.act(async () => skip.props.onPress());
    expect(setTourStatus).toHaveBeenCalledWith('skipped');
  });

  test('con la guía terminada no dibuja ningún globo', async () => {
    authMock.mockReturnValue(athlete('completed'));
    const tree = await mount('Today', jest.fn(), (
      <>
        {startButton}
        <TourOverlay />
      </>
    ));
    expect(texts(tree)).not.toContain('Paso 1 de 3');
  });
});

describe('«Cómo usar Cycles» en el menú del avatar', () => {
  const open = async (restart: jest.Mock | null) => {
    let tree!: Instance;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        restart ? (
          <TourContext.Provider value={{ restart } as never}>
            <ProfileAvatar />
          </TourContext.Provider>
        ) : (
          <ProfileAvatar />
        ),
      );
    });
    mounted.push(tree);
    await ReactTestRenderer.act(async () => {
      tree.root.find(n => n.props.accessibilityLabel === 'Abrir perfil').props.onPress();
    });
    return tree;
  };

  test('vuelve a pedir la guía', async () => {
    const restart = jest.fn();
    const tree = await open(restart);
    // El primer nodo con ese texto es el fondo del menú; el botón es el último.
    const items = tree.root.findAll(n => typeof n.props.onPress === 'function' && n.findAll(c => c.props.children === 'Cómo usar Cycles').length > 0);
    await ReactTestRenderer.act(async () => items[items.length - 1].props.onPress());
    expect(restart).toHaveBeenCalled();
  });

  test('sin guía disponible el menú no la ofrece', async () => {
    const tree = await open(null);
    expect(texts(tree)).not.toContain('Cómo usar Cycles');
  });
});
