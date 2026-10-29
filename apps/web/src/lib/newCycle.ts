// Valores del formulario «Nuevo ciclo» de la ficha del atleta. Funciones puras,
// sin red; días "AAAA-MM-DD".
import type { TrainingCycle } from "@cycles/shared";
import { addDays, mondayOf } from "./weekCalendar";

export const MAX_WEEKS = 52;

// Fin de un ciclo de N semanas que empieza en `start`: inicio + 7N − 1 días (la
// misma cuenta de las plantillas del API).
export function endForWeeks(start: string, weeks: number): string {
  return addDays(start, weeks * 7 - 1);
}

// Próximo lunes desde `iso` (hoy mismo si ya es lunes).
export function nextMonday(iso: string): string {
  return mondayOf(iso) === iso ? iso : addDays(mondayOf(iso), 7);
}

// Inicio sugerido: el día siguiente al fin del último ciclo que sigue vigente
// (termina hoy o después); si no hay, el próximo lunes.
export function suggestStart(cycles: Pick<TrainingCycle, "endDate" | "status">[], today: string): string {
  const lastEnd = cycles
    .filter((c) => c.status !== "archived")
    .map((c) => c.endDate.slice(0, 10))
    .filter((end) => end >= today)
    .sort()
    .pop();
  return lastEnd ? addDays(lastEnd, 1) : nextMonday(today);
}
