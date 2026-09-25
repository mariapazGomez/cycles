import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = 'cycles.accessToken';
const REFRESH_TOKEN_KEY = 'cycles.refreshToken';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

// Cache en memoria: evita esperar a AsyncStorage en cada request, ya que
// las lecturas son asíncronas pero el header Authorization se arma sync.
let accessToken: string | null = null;
let refreshToken: string | null = null;

export const tokenStore = {
  async load(): Promise<void> {
    const stored = await AsyncStorage.getMany([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
    accessToken = stored[ACCESS_TOKEN_KEY];
    refreshToken = stored[REFRESH_TOKEN_KEY];
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
    await AsyncStorage.setMany({
      [ACCESS_TOKEN_KEY]: tokens.accessToken,
      [REFRESH_TOKEN_KEY]: tokens.refreshToken,
    });
  },

  async clear(): Promise<void> {
    accessToken = null;
    refreshToken = null;
    await AsyncStorage.removeMany([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
  },
};
