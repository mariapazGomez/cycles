import type { TeamEventsResponse } from "../types/team-event";

// Ejemplo de GET /me/team-events (CYC-317): la app lo usa sin base; una prueba e2e comprueba que
// la respuesta real tiene esta forma.
export const teamEventsFixture: TeamEventsResponse = {
  events: [
    {
      seriesId: "00000000-0000-4000-8000-00000000e001",
      teamId: "00000000-0000-4000-8000-00000000a001",
      teamName: "Voleibol sub-17",
      type: "match",
      title: "Partido de liga",
      date: "2026-11-28",
      seriesDate: "2026-11-28",
      startTime: "10:00",
      durationMin: 120,
      allDay: false,
      notes: "Llegar 30 minutos antes.",
      repeat: null,
    },
  ],
};
