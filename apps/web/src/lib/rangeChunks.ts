import { EVENT_RANGE_MAX_DAYS } from "@cycles/shared";
import { addDays } from "./eventCalendar";

// Tramos de la consulta: la API acepta hasta 92 días por pedido; un rango más largo se parte.
export function rangeChunks(from: string, to: string, max = EVENT_RANGE_MAX_DAYS): Array<{ from: string; to: string }> {
  const chunks: Array<{ from: string; to: string }> = [];
  for (let start = from; start <= to; start = addDays(start, max)) {
    const end = addDays(start, max - 1);
    chunks.push({ from: start, to: end < to ? end : to });
  }
  return chunks;
}

