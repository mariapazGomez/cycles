import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

// Claves antiguas (AsyncStorage, sin cifrar): solo se leen para migrar.
const LEGACY_ACCESS_TOKEN_KEY = 'cycles.accessToken';
const LEGACY_REFRESH_TOKEN_KEY = 'cycles.refreshToken';
// Marca de "esta instalación ya arrancó". iOS conserva el Keychain aunque se
// desinstale la app; sin esta marca, una reinstalación heredaría la sesión
// de la instalación anterior.
const LAUNCHED_KEY = 'cycles.launched';

const KEYCHAIN_OPTIONS = {
  service: 'cycles.tokens',
  accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};
const KEYCHAIN_USER = 'session';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

// Cache en memoria: evita esperar al Keychain en cada request, ya que las
// lecturas son asíncronas pero el header Authorization se arma sync.
let accessToken: string | null = null;
let refreshToken: string | null = null;

async function writeKeychain(tokens: StoredTokens): Promise<void> {
  await Keychain.setGenericPassword(KEYCHAIN_USER, JSON.stringify(tokens), KEYCHAIN_OPTIONS);
}

async function readKeychain(): Promise<StoredTokens | null> {
  const stored = await Keychain.getGenericPassword({ service: KEYCHAIN_OPTIONS.service });
  if (!stored) {
    return null;
  }
  try {
    const parsed = JSON.parse(stored.password);
    if (typeof parsed?.accessToken === 'string' && typeof parsed?.refreshToken === 'string') {
      return parsed;
    }
  } catch {
    // Contenido ilegible: se trata como sin sesión.
  }
  return null;
}

export const tokenStore = {
  async load(): Promise<void> {
    const stored = await AsyncStorage.getMany([
      LAUNCHED_KEY,
      LEGACY_ACCESS_TOKEN_KEY,
      LEGACY_REFRESH_TOKEN_KEY,
    ]);
    const legacyAccess = stored[LEGACY_ACCESS_TOKEN_KEY];
    const legacyRefresh = stored[LEGACY_REFRESH_TOKEN_KEY];

    let tokens: StoredTokens | null = null;

    if (legacyAccess && legacyRefresh) {
      // Sesión guardada por una versión anterior: se pasa al Keychain para
      // que nadie tenga que volver a iniciar sesión.
      tokens = { accessToken: legacyAccess, refreshToken: legacyRefresh };
      await writeKeychain(tokens);
      await AsyncStorage.removeMany([LEGACY_ACCESS_TOKEN_KEY, LEGACY_REFRESH_TOKEN_KEY]);
      await AsyncStorage.setMany({ [LAUNCHED_KEY]: '1' });
    } else if (!stored[LAUNCHED_KEY]) {
      // Primer arranque de esta instalación: cualquier sesión en el Keychain
      // es un resto de una instalación anterior.
      await Keychain.resetGenericPassword({ service: KEYCHAIN_OPTIONS.service });
      await AsyncStorage.setMany({ [LAUNCHED_KEY]: '1' });
    } else {
      tokens = await readKeychain();
    }

    accessToken = tokens?.accessToken ?? null;
    refreshToken = tokens?.refreshToken ?? null;
  },

  getAccessToken(): string | null {
    return accessToken;
  },

  getRefreshToken(): string | null {
    return refreshToken;
  },

  async setTokens(tokens: StoredTokens): Promise<void> {
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
    await writeKeychain(tokens);
  },

  async clear(): Promise<void> {
    accessToken = null;
    refreshToken = null;
    await Keychain.resetGenericPassword({ service: KEYCHAIN_OPTIONS.service });
  },
};
