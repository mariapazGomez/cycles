import { Platform } from 'react-native';

// En desarrollo (Metro) la app usa la API local. En el simulador de iOS
// localhost es la máquina de desarrollo; en el emulador de Android localhost
// es el propio emulador y la máquina de desarrollo se ve como 10.0.2.2.
// Las compilaciones Release (las que se instalan en el celular) usan la API
// de producción.
const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const API_URL = __DEV__ ? `http://${DEV_HOST}:3000` : 'https://api.getcycles.app';
