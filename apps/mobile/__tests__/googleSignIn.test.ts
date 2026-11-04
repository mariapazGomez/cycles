import { authorize } from 'react-native-app-auth';
import { GoogleSignInCancelled, makeNonce, requestGoogleCredential } from '../src/services/googleSignIn';

jest.mock('react-native-app-auth', () => ({ authorize: jest.fn() }));
jest.mock('../src/config/google', () => ({ GOOGLE_IOS_CLIENT_ID: '123456-abc.apps.googleusercontent.com' }));

const authorizeMock = authorize as jest.Mock;

beforeEach(() => jest.clearAllMocks());

test('pide el token con el ID de cliente, PKCE y un nonce propio, y devuelve ese mismo nonce', async () => {
  authorizeMock.mockResolvedValue({ idToken: 'jwt-de-google' });
  const credential = await requestGoogleCredential();
  const config = authorizeMock.mock.calls[0][0];
  expect(config.issuer).toBe('https://accounts.google.com');
  expect(config.clientId).toBe('123456-abc.apps.googleusercontent.com');
  expect(config.redirectUrl).toBe('com.googleusercontent.apps.123456-abc:/oauth2redirect/google');
  expect(config.usePKCE).toBe(true);
  expect(config.scopes).toEqual(['openid', 'email', 'profile']);
  expect(config.additionalParameters.nonce).toBe(credential.nonce);
  expect(credential.idToken).toBe('jwt-de-google');
  expect(credential.nonce.length).toBeGreaterThanOrEqual(16);
});

test('el nonce es distinto en cada petición', () => {
  expect(makeNonce()).toMatch(/^[0-9a-f]{32}$/);
  expect(makeNonce()).not.toBe(makeNonce());
});

test.each([
  [{ code: 'access_denied', message: 'x' }],
  [{ message: 'User cancelled flow' }],
  [{ message: 'The operation couldn’t be completed. (org.openid.appauth.general error -3.)' }],
])('si la persona cierra la ventana (%j) se avisa como cancelación', async err => {
  authorizeMock.mockRejectedValue(err);
  await expect(requestGoogleCredential()).rejects.toBeInstanceOf(GoogleSignInCancelled);
});

test('otros errores se propagan tal cual', async () => {
  authorizeMock.mockRejectedValue(new Error('sin red'));
  await expect(requestGoogleCredential()).rejects.toThrow('sin red');
});

test('si Google no entrega el token de identidad, falla con un mensaje claro', async () => {
  authorizeMock.mockResolvedValue({});
  await expect(requestGoogleCredential()).rejects.toThrow(/token de identidad/);
});
