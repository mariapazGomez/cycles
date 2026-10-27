import { startOfUtcDay } from "../common/training";

const DAY_MS = 24 * 60 * 60 * 1000;

// Semana del ciclo (1 en adelante) a la que pertenece un día, contada desde el
// día de inicio en bloques de 7 días (la misma regla que planWeekAt). Antes del
// inicio devuelve 0.
export function weekOfDate(cycleStart: Date, day: Date): number {
  const diff = Math.round((startOfUtcDay(day).getTime() - startOfUtcDay(cycleStart).getTime()) / DAY_MS);
  return diff < 0 ? 0 : Math.floor(diff / 7) + 1;
}

export interface SlotRow {
  id: string;
  slotNumber: number;
  scheduledDate: Date | null;
}

// La app móvil ordena las sesiones por (semana, espacio). Cuando el coach agrega
// una sesión en un día anterior a otras de la misma semana, los espacios que ya
// usan las sesiones con fecha se reparten otra vez siguiendo el orden de las
// fechas (a igual fecha, gana el espacio más bajo). Las sesiones sin fecha no se
// tocan, y el conjunto de espacios usados no cambia. Devuelve solo los cambios.
export function reassignSlots(rows: SlotRow[]): Map<string, number> {
  const dated = rows.filter((row) => row.scheduledDate !== null);
  const slots = dated.map((row) => row.slotNumber).sort((a, b) => a - b);
  const byDate = [...dated].sort(
    (a, b) => a.scheduledDate!.getTime() - b.scheduledDate!.getTime() || a.slotNumber - b.slotNumber,
  );
  const changes = new Map<string, number>();
  byDate.forEach((row, index) => {
    if (row.slotNumber !== slots[index]) changes.set(row.id, slots[index]);
  });
  return changes;
}
