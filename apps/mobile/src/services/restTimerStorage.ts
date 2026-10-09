import AsyncStorage from '@react-native-async-storage/async-storage';

const ENDS_AT_KEY = 'cycles.restTimer.endsAt';
const TOTAL_KEY = 'cycles.restTimer.total';

export interface StoredRest {
  endsAt: number;
  total: number;
}

// La pausa en curso se guarda en el teléfono para sobrevivir a que iOS cierre
// la app en segundo plano. Solo se guardan dos números: la hora de fin y la
// duración total.
export async function saveRest(rest: StoredRest): Promise<void> {
  try {
    await AsyncStorage.setMany({ [ENDS_AT_KEY]: String(rest.endsAt), [TOTAL_KEY]: String(rest.total) });
  } catch {
    // Best-effort: sin almacenamiento la pausa funciona igual, solo no sobrevive a un cierre.
  }
}

export async function clearRest(): Promise<void> {
  try {
    await AsyncStorage.removeMany([ENDS_AT_KEY, TOTAL_KEY]);
  } catch {
    // Best-effort.
  }
}

// La pausa guardada que sigue vigente, o null si no hay o ya terminó. Una
// pausa vencida se borra: terminó mientras la app estaba cerrada.
export async function loadRest(now: number = Date.now()): Promise<StoredRest | null> {
  try {
    const stored = await AsyncStorage.getMany([ENDS_AT_KEY, TOTAL_KEY]);
    const endsAt = Number(stored[ENDS_AT_KEY]);
    const total = Number(stored[TOTAL_KEY]);
    if (Number.isFinite(endsAt) && Number.isFinite(total) && total > 0 && endsAt > now) {
      return { endsAt, total };
    }
  } catch {
    // Contenido ilegible: se trata como sin pausa.
  }
  await clearRest();
  return null;
}
