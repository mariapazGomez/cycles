import type { WeeklySummary } from "../types/summary";

// Respuesta de ejemplo de GET /me/weekly-summary, fijada por la prueba de la API
// (weekly-summary.spec.ts: lo que produce el código real) y por la e2e (misma forma). La app la
// usa en sus pruebas: si la forma cambia, fallan todas. No se exporta desde el índice del paquete.
export const weeklySummaryFixture: WeeklySummary = {
  weekStart: "2026-11-09",
  weekEnd: "2026-11-15",
  sessionsPlanned: 3,
  sessionsDone: 2,
  minutesTrained: 95,
  averageSrpe: 6.5,
};

// Semana sin sesiones o sin cierres con datos: ceros en conteos y null donde no hay dato.
export const weeklySummaryEmptyFixture: WeeklySummary = {
  weekStart: "2026-11-16",
  weekEnd: "2026-11-22",
  sessionsPlanned: 0,
  sessionsDone: 0,
  minutesTrained: null,
  averageSrpe: null,
};
