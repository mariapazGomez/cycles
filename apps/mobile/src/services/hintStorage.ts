import AsyncStorage from '@react-native-async-storage/async-storage';

const VIDEO_HINT_KEY = 'cycles.hint.exerciseVideo';
const FIRST_SET_HINT_KEY = 'cycles.hint.firstSet';
const FIRST_SESSION_KEY = 'cycles.hint.firstSession';

// Si la persona ya vio un aviso de «una sola vez». Sin almacenamiento legible
// se trata como "ya visto": un aviso que no se puede descartar para siempre
// molesta más de lo que ayuda.
async function hasSeen(key: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(key)) === '1';
  } catch {
    return true;
  }
}

async function markSeen(key: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, '1');
  } catch {
    // Best-effort: si no se guarda, el aviso vuelve a salir una vez más.
  }
}

export const hasSeenVideoHint = () => hasSeen(VIDEO_HINT_KEY);
export const markVideoHintSeen = () => markSeen(VIDEO_HINT_KEY);

// Pista de la primera serie (guía de primer uso).
export const hasSeenFirstSetHint = () => hasSeen(FIRST_SET_HINT_KEY);
export const markFirstSetHintSeen = () => markSeen(FIRST_SET_HINT_KEY);

// Cierre de la primera sesión guardada.
export const hasSeenFirstSessionClosing = () => hasSeen(FIRST_SESSION_KEY);
export const markFirstSessionClosingSeen = () => markSeen(FIRST_SESSION_KEY);
