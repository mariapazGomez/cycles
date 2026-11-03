import { NativeModules, Platform } from 'react-native';

interface RestActivityModule {
  show(startedAtMs: number, endsAtMs: number): Promise<void>;
  hide(): Promise<void>;
}

// Live Activity del descanso: la cuenta regresiva en la isla dinámica y la
// pantalla de bloqueo del iPhone. Solo existe en iOS; en Android y en
// versiones de iOS sin soporte no hace nada.
const native: RestActivityModule | undefined = Platform.OS === 'ios' ? NativeModules.RestActivity : undefined;

export async function showRestActivity(startedAt: number, endsAt: number): Promise<void> {
  try {
    await native?.show(startedAt, endsAt);
  } catch {
    // Best-effort: sin la isla, el descanso y su aviso siguen funcionando.
  }
}

export async function hideRestActivity(): Promise<void> {
  try {
    await native?.hide();
  } catch {
    // Best-effort.
  }
}
