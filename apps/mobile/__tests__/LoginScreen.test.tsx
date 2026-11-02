import React from 'react';
import { Linking } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { LoginScreen } from '../src/screens/LoginScreen';
import { ApiError } from '../src/services/httpClient';
import { REGISTER_URL } from '../src/config/legal';

const mockLoginWithApple = jest.fn();
jest.mock('../src/store/AuthContext', () => ({
  useAuth: () => ({ login: jest.fn(), loginWithApple: mockLoginWithApple }),
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../src/components/Icon', () => ({ Icon: () => null }));
jest.mock('../src/components/ChainBackground', () => ({ ChainBackground: () => null }));
jest.mock('../src/components/Logo', () => ({ Logo: () => null }));

const performRequest = appleAuth.performRequest as jest.Mock;

async function mount() {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<LoginScreen />);
  });
  return tree;
}

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
