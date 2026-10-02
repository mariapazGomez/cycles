// En desarrollo (simulador con Metro) la app usa la API local: el simulador
// comparte la red del host, así que localhost apunta a la máquina de
// desarrollo. Las compilaciones Release (las que se instalan en el celular)
// usan la API de producción.
export const API_URL = __DEV__ ? 'http://localhost:3000' : 'https://api.getcycles.app';
