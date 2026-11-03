import AsyncStorage from '@react-native-async-storage/async-storage';

const VIDEO_HINT_KEY = 'cycles.hint.exerciseVideo';

// Si la persona ya vio el aviso del acceso al video. Sin almacenamiento
// legible se trata como "ya visto": un aviso que no se puede descartar para
// siempre molesta más de lo que ayuda.
export async function hasSeenVideoHint(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(VIDEO_HINT_KEY)) === '1';
  } catch {
    return true;
  }
}

export async function markVideoHintSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(VIDEO_HINT_KEY, '1');
  } catch {
    // Best-effort: si no se guarda, el aviso vuelve a salir una vez más.
  }
}
