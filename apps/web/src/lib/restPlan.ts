// Descanso entre series (CYC-285). No hay descanso por defecto: solo corre el que el coach
// planificó en el ejercicio (`targetRestSeconds`). Si falta o es 0, no hay descanso y el
// registro no abre temporizador. Misma regla que la app móvil.
export function plannedRestSeconds(targetRestSeconds: number | null | undefined): number {
  return typeof targetRestSeconds === "number" && Number.isFinite(targetRestSeconds) && targetRestSeconds > 0 ? targetRestSeconds : 0;
}
