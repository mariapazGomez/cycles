import type { AthleteEventsResponse } from "../types/athlete-event";

// Respuesta de ejemplo de GET /me/events?from=2026-11-02&to=2026-11-08, con la repetición
// ya expandida. La fija la prueba de la API y la consume la prueba de la app. No se
// exporta desde el índice del paquete: solo la importan las pruebas.
export const athleteEventsFixture: AthleteEventsResponse = {
  events: [
    {
      seriesId: "ev-volei",
      date: "2026-11-02",
      isException: false,
      type: "training",
      title: "Voleibol",
      startTime: "19:00",
      durationMin: 90,
      allDay: false,
      intensity: "medium",
      notes: null,
      repeat: { days: [0, 1], until: "2026-12-14" },
    },
    {
      seriesId: "ev-volei",
      date: "2026-11-03",
      isException: true,
      type: "training",
      title: "Voleibol",
      startTime: "20:00",
      durationMin: 60,
      allDay: false,
      intensity: "low",
      notes: null,
      repeat: { days: [0, 1], until: "2026-12-14" },
    },
    {
      seriesId: "ev-liga",
      date: "2026-11-07",
      isException: false,
      type: "match",
      title: "Partido de liga",
      startTime: null,
      durationMin: null,
      allDay: true,
      intensity: "high",
      notes: "Cancha 2",
      repeat: null,
    },
  ],
};
