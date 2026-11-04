import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { LoginScreen } from '../src/screens/LoginScreen';
import { ApiError } from '../src/services/httpClient';
import * as google from '../src/services/googleSignIn';

const mockLoginWithGoogle = jest.fn();
jest.mock('../src/store/AuthContext', () => ({
  useAuth: () => ({ login: jest.fn(), loginWithApple: jest.fn(), loginWithGoogle: mockLoginWithGoogle }),
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../src/components/Icon', () => ({ Icon: () => null }));
jest.mock('../src/hooks/useReduceMotion', () => ({ useReduceMotion: () => true }));
jest.mock('../src/services/googleSignIn', () => {
  class GoogleSignInCancelled extends Error {}
  return { isGoogleSignInAvailable: true, requestGoogleCredential: jest.fn(), GoogleSignInCancelled };
});

const requestMock = google.requestGoogleCredential as jest.Mock;
const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

async function mount() {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<LoginScreen />);
  });
  mounted.push(tree);
  return tree;
}

const tapGoogle = (tree: ReactTestRenderer.ReactTestRenderer) =>
  ReactTestRenderer.act(async () => {
    tree.root.findByProps({ accessibilityLabel: 'Continuar con Google' }).props.onPress();
  });

const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAll(n => (n.type as unknown) === 'Text').map(n => n.children.join(''));

beforeEach(() => jest.clearAllMocks());
afterEach(() => {
  mounted.splice(0).forEach(tree => ReactTestRenderer.act(() => tree.unmount()));
});

test('manda a la sesión el token y el nonce de Google', async () => {
  requestMock.mockResolvedValue({ idToken: 'jwt', nonce: 'nonce-propio' });
  mockLoginWithGoogle.mockResolvedValue(undefined);
  await tapGoogle(await mount());
  expect(mockLoginWithGoogle).toHaveBeenCalledWith({ idToken: 'jwt', nonce: 'nonce-propio' });
});

test('si la persona cierra la ventana de Google, no muestra error', async () => {
  requestMock.mockRejectedValue(new google.GoogleSignInCancelled());
  const tree = await mount();
  await tapGoogle(tree);
  expect(mockLoginWithGoogle).not.toHaveBeenCalled();
  expect(texts(tree).some(t => t.includes('No pudimos'))).toBe(false);
});

test('registro cerrado: muestra el mensaje del servidor y el enlace al registro', async () => {
  requestMock.mockResolvedValue({ idToken: 'jwt', nonce: 'n' });
  mockLoginWithGoogle.mockRejectedValue(new ApiError(403, 'Por ahora el registro está cerrado.', 'no_account'));
  const tree = await mount();
  await tapGoogle(tree);
  expect(texts(tree)).toContain('Por ahora el registro está cerrado.');
  expect(texts(tree)).toContain('Registrarme en la web');
});
