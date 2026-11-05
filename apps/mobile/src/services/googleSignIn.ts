import { Platform } from 'react-native';
import { authorize } from 'react-native-app-auth';
import { GOOGLE_ANDROID_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from '../config/google';

export interface GoogleCredential {
  idToken: string;
  nonce: string;
}

// La persona cerró la ventana de Google: no es un error que mostrar.
export class GoogleSignInCancelled extends Error {
  constructor() {
    super('Inicio de sesión con Google cancelado');
    this.name = 'GoogleSignInCancelled';
  }
}

// El ID de cliente de la plataforma; vacío si la compilación no lo trae (ver scripts/write-google-config.js).
const CLIENT_ID =
  Platform.OS === 'ios'
    ? GOOGLE_IOS_CLIENT_ID
    : Platform.OS === 'android'
      ? GOOGLE_ANDROID_CLIENT_ID
      : '';

export const isGoogleSignInAvailable = CLIENT_ID !== '';

// Esquema de URL inverso del ID de cliente: por ahí Google devuelve a la persona a la app.
// iOS lo registra en Info.plist y Android en el manifiesto (build.gradle).
const REDIRECT_URL = `com.googleusercontent.apps.${CLIENT_ID.replace(
  '.apps.googleusercontent.com',
  '',
)}:/oauth2redirect${Platform.OS === 'ios' ? '/google' : ''}`;

// El nonce liga el token a esta petición; el API lo compara con el que trae el token.
// Hermes no siempre expone crypto.getRandomValues: sin él se usa Math.random, que
// basta aquí porque el token además se valida por firma, audiencia y caducidad.
export function makeNonce(): string {
  const bytes = new Uint8Array(16);
  const webCrypto = (
    globalThis as {
      crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array };
    }
  ).crypto;
  if (webCrypto?.getRandomValues) {
    webCrypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function isCancel(err: unknown): boolean {
  const { code, message } = err as { code?: string; message?: string };
  return (
    code === 'access_denied' ||
    /cancel/i.test(message ?? '') ||
    /error -3\b/.test(message ?? '')
  );
}

// Abre la ventana segura del sistema (ASWebAuthenticationSession en iOS, Chrome Custom Tabs en Android) con Google y
// devuelve el token de identidad. Flujo de código con PKCE; el redireccionamiento
// vuelve por el esquema inverso del ID de cliente, registrado en Info.plist al compilar.
export async function requestGoogleCredential(): Promise<GoogleCredential> {
  const nonce = makeNonce();
  try {
    const result = await authorize({
      issuer: 'https://accounts.google.com',
      clientId: CLIENT_ID,
      redirectUrl: REDIRECT_URL,
      scopes: ['openid', 'email', 'profile'],
      additionalParameters: { nonce },
      usePKCE: true,
      useNonce: true,
    });
    if (!result.idToken) {
      throw new Error(
        'Google no entregó el token de identidad. Vuelve a intentarlo.',
      );
    }
    return { idToken: result.idToken, nonce };
  } catch (err) {
    if (isCancel(err)) {
      throw new GoogleSignInCancelled();
    }
    throw err;
  }
}
