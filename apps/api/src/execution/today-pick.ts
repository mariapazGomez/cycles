// Qué sesión muestra «Hoy» cuando el atleta tiene más de un ciclo con pendientes (CYC-314,
// POR CONFIRMAR 7): la de hoy y, si no hay, la más cercana en fecha (a igual distancia, la que
// viene). Con un solo ciclo, todo sigue como antes. Función pura.
export interface TodayCandidate {
  id: string;
  scheduledDate: Date | null;
}

const DAY_MS = 86_400_000;

// `candidates`: la siguiente pendiente de cada ciclo y las pendientes con fecha cercanas, en el orden
// de siempre (ciclo que empezó primero). `day`: el hoy del atleta.
export function pickNearest<T extends TodayCandidate>(candidates: T[], day: Date): T | null {
  const today = Math.floor(day.getTime() / DAY_MS);
  let best: { item: T; distance: number; future: boolean } | null = null;
  for (const item of candidates) {
    if (!item.scheduledDate) continue;
    const diff = Math.floor(item.scheduledDate.getTime() / DAY_MS) - today;
    const current = { item, distance: Math.abs(diff), future: diff >= 0 };
    if (!best || current.distance < best.distance || (current.distance === best.distance && current.future && !best.future)) best = current;
  }
  return best?.item ?? candidates[0] ?? null;
}
