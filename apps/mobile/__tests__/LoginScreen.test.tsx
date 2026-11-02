import React from 'react';
import { Linking } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { LoginScreen } from '../src/screens/LoginScreen';
import { ApiError } from '../src/services/httpClient';
import { REGISTER_URL } from '../src/config/legal';

const mockLoginWithApple = jest.fn();
const mockLogin = jest.fn();
jest.mock('../src/store/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin, loginWithApple: mockLoginWithApple }),
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../src/components/Icon', () => ({ Icon: () => null }));
// Sin animaciones en las pruebas: así no quedan temporizadores corriendo.
jest.mock('../src/hooks/useReduceMotion', () => ({ useReduceMotion: () => true }));

const performRequest = appleAuth.performRequest as jest.Mock;

const mounted: ReactTestRenderer.ReactTestRenderer[] = [];
async function mount() {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<LoginScreen />);
  });
  mounted.push(tree);
  return tree;
}

afterEach(() => {
  mounted.splice(0).forEach(tree => ReactTestRenderer.act(() => tree.unmount()));
});

async function tapApple(tree: ReactTestRenderer.ReactTestRenderer) {
  await ReactTestRenderer.act(async () => {
    tree.root.findByProps({ accessibilityLabel: 'Continuar con Apple' }).props.onPress();
  });
}

const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAll(n => (n.type as unknown) === 'Text').map(n => n.children.join(''));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
});

test('manda el token de identidad y el nonce que entregó Apple', async () => {
  performRequest.mockResolvedValue({ identityToken: 'jwt', nonce: 'nonce-original' });
  mockLoginWithApple.mockResolvedValue(undefined);
  const tree = await mount();
  await tapApple(tree);
  expect(mockLoginWithApple).toHaveBeenCalledWith({ idToken: 'jwt', nonce: 'nonce-original' });
});

test('si la persona cancela, no muestra ningún error', async () => {
  performRequest.mockRejectedValue({ code: appleAuth.Error.CANCELED });
  const tree = await mount();
  await tapApple(tree);
  expect(mockLoginWithApple).not.toHaveBeenCalled();
  expect(texts(tree).some(t => t.includes('No pudimos'))).toBe(false);
});

test('sin cuenta, muestra el mensaje y un botón que abre el registro en la web', async () => {
  performRequest.mockResolvedValue({ identityToken: 'jwt', nonce: 'n' });
  mockLoginWithApple.mockRejectedValue(new ApiError(403, 'No encontramos una cuenta de Cycles con ese correo.', 'no_account'));
  const tree = await mount();
  await tapApple(tree);
  expect(texts(tree)).toContain('No encontramos una cuenta de Cycles con ese correo.');
  expect(texts(tree)).toContain('Registrarme en la web');
  await ReactTestRenderer.act(async () => {
    const label = tree.root.findAll(n => (n.type as unknown) === 'Text' && n.children.join('') === 'Registrarme en la web')[0];
    let node = label.parent;
    while (node && !node.props.onPress) node = node.parent;
    node!.props.onPress();
  });
  expect(Linking.openURL).toHaveBeenCalledWith(REGISTER_URL);
});

test('otro error del servidor se muestra sin el botón de registro', async () => {
  performRequest.mockResolvedValue({ identityToken: 'jwt', nonce: 'n' });
  mockLoginWithApple.mockRejectedValue(new ApiError(401, 'No pudimos verificar tu inicio de sesión.'));
  const tree = await mount();
  await tapApple(tree);
  expect(texts(tree)).toContain('No pudimos verificar tu inicio de sesión.');
  expect(texts(tree)).not.toContain('Registrarme en la web');
});

const field = (tree: ReactTestRenderer.ReactTestRenderer, label: string) => tree.root.findByProps({ accessibilityLabel: label, selectionColor: '#1a66dd' });

const typeCredentials = async (tree: ReactTestRenderer.ReactTestRenderer) => {
  await ReactTestRenderer.act(async () => {
    field(tree, 'Correo').props.onChangeText('  ana@correo.com ');
    field(tree, 'Contraseña').props.onChangeText('secreta123');
  });
};

const press = async (tree: ReactTestRenderer.ReactTestRenderer, label: string) => {
  await ReactTestRenderer.act(async () => {
    tree.root.findByProps({ accessibilityLabel: label, accessibilityRole: 'button' }).props.onPress();
  });
};

test('entra con el correo sin espacios y la contraseña', async () => {
  mockLogin.mockResolvedValue(undefined);
  const tree = await mount();
  await typeCredentials(tree);
  await press(tree, 'Entrar');
  expect(mockLogin).toHaveBeenCalledWith('ana@correo.com', 'secreta123');
});

test('sin correo o sin contraseña no intenta entrar', async () => {
  const tree = await mount();
  await press(tree, 'Entrar');
  expect(mockLogin).not.toHaveBeenCalled();
});

test('con credenciales incorrectas muestra el aviso y vuelve a dejar intentar', async () => {
  mockLogin.mockRejectedValue(new ApiError(401, 'x'));
  const tree = await mount();
  await typeCredentials(tree);
  await press(tree, 'Entrar');
  expect(texts(tree)).toContain('Correo o contraseña incorrectos. Revisa tus datos.');
  mockLogin.mockResolvedValue(undefined);
  await press(tree, 'Entrar');
  expect(mockLogin).toHaveBeenCalledTimes(2);
});

test('el ojo muestra y oculta la contraseña', async () => {
  const tree = await mount();
  expect(field(tree, 'Contraseña').props.secureTextEntry).toBe(true);
  await press(tree, 'Mostrar contraseña');
  expect(field(tree, 'Contraseña').props.secureTextEntry).toBe(false);
  await press(tree, 'Ocultar contraseña');
  expect(field(tree, 'Contraseña').props.secureTextEntry).toBe(true);
});
