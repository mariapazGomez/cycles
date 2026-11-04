import { Platform } from 'react-native';
import { appleAuth } from '@invertase/react-native-apple-authentication';

export interface AppleCredential {
  idToken: string;
  nonce: string;
}

// El usuario cerró la hoja de Apple: no es un error que mostrar.
export class AppleSignInCancelled extends Error {
  constructor() {
    super('Inicio de sesión con Apple cancelado');
    this.name = 'AppleSignInCancelled';
  }
}

export const isAppleSignInAvailable = Platform.OS === 'ios' && appleAuth.isSupported;

// Abre la hoja de Apple y devuelve el token de identidad. La librería genera un
// nonce aleatorio, se lo manda a Apple con SHA-256 y nos devuelve el original;
// el API compara ambos al verificar el token.
export async function requestAppleCredential(): Promise<AppleCredential> {
  try {
    const response = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL],
    });
    if (!response.identityToken || !response.nonce) {
      throw new Error('Apple no entregó el token de identidad. Vuelve a intentarlo.');
    }
    return { idToken: response.identityToken, nonce: response.nonce };
  } catch (err) {
    if ((err as { code?: string }).code === appleAuth.Error.CANCELED) {
      throw new AppleSignInCancelled();
    }
    throw err;
  }
}

// Pide a Apple un código de un solo uso para revocar la autorización de la cuenta
// al eliminarla (regla 5.1.1(v)). No se guarda: el API lo canjea de inmediato.
export async function requestAppleAuthorizationCode(): Promise<string> {
  try {
    const response = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [],
    });
    if (!response.authorizationCode) {
      throw new Error('Apple no entregó la confirmación. Vuelve a intentarlo.');
    }
    return response.authorizationCode;
  } catch (err) {
    if ((err as { code?: string }).code === appleAuth.Error.CANCELED) {
      throw new AppleSignInCancelled();
    }
    throw err;
  }
}
