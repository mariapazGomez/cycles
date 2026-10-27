import { addDays } from "../common/training";

// Una plantilla (ciclo sin atleta) no tiene fechas reales, pero toda la app
// lee startDate y endDate. Por eso guarda fechas de referencia fijas: un lunes
// cualquiera y el fin según sus semanas. Las fechas reales se ponen al asignarla
// a un atleta (docs/diseno/biblioteca).
export const TEMPLATE_REFERENCE_START = new Date(Date.UTC(2001, 0, 1));

// Último día de un ciclo de `weeks` semanas que empieza en `start` (inclusive).
export function endDateForWeeks(start: Date, weeks: number): Date {
  return addDays(start, weeks * 7 - 1);
}

export function templateDates(weeks: number): { startDate: Date; endDate: Date } {
  return { startDate: TEMPLATE_REFERENCE_START, endDate: endDateForWeeks(TEMPLATE_REFERENCE_START, weeks) };
}
