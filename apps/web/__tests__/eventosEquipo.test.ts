import type { TeamCalendarResponse, TeamEventOccurrence } from "@cycles/shared";
import { changeDate, clashLine, countsLabel, emptyForm, eventRows, eventsForClash, formOf, formPayload, formProblem, hourLabel, noFiguresLabel, rankOf, repeatDaysOf, toggleDay, weekTitle, whoLabel } from "../src/lib/teamEvents";
import { loadClashes } from "../src/lib/loadClash";

// Semana del lunes 23 al domingo 29 de noviembre de 2026.
const match: TeamEventOccurrence = {
  seriesId: "e1", teamId: "t1", teamName: "Voleibol", type: "match", title: "Partido de liga",
  date: "2026-11-28", seriesDate: "2026-11-21", startTime: "16:00", durationMin: 120, allDay: false,
  notes: "Llegar antes", repeat: { days: [5], until: null },
};
const activity = (athleteId: string, athleteName: string, over: Partial<TeamCalendarResponse["athleteEvents"][number]> = {}): TeamCalendarResponse["athleteEvents"][number] => ({
  athleteId, athleteName, seriesId: `s-${athleteId}`, date: "2026-11-24", type: "training", sport: "volleyball",
  title: "Entrenamiento de voleibol", startTime: "19:00", durationMin: 90, allDay: false, intensity: null, notes: null, repeat: null, isException: false, ...over,
});
const data: TeamCalendarResponse = {
  teamEvents: [match, { ...match, date: "2026-11-30" }],
  athleteEvents: [activity("a", "Valentina Soto"), activity("b", "Camila Rojas", { title: "entrenamiento de voleibol " }), activity("c", "Matías Vera", { date: "2026-11-26", type: "travel", sport: null, title: "Viaje", allDay: true, startTime: null, durationMin: null })],
};

describe("lista de eventos de la semana", () => {
  const rows = eventRows(data, "2026-11-23", "2026-11-29");

  it("ordena por día, deja fuera otras semanas y junta lo que varios agregaron igual", () => {
    expect(rows.map((r) => [r.date, r.kind])).toEqual([["2026-11-24", "athletes"], ["2026-11-26", "athletes"], ["2026-11-28", "team"]]);
    const first = rows[0];
    expect(first.kind === "athletes" && whoLabel(first.people)).toBe("2 atletas");
    const second = rows[1];
    expect(second.kind === "athletes" && whoLabel(second.people)).toBe("Matías Vera");
  });

  it("el deporte no separa filas que se ven iguales", () => {
    const same = { ...data, athleteEvents: [activity("a", "Valentina Soto", { sport: "swimming" }), activity("b", "Camila Rojas", { sport: "basketball" })] };
    expect(eventRows(same, "2026-11-23", "2026-11-29").filter((r) => r.kind === "athletes")).toHaveLength(1);
  });

  it("a distinta hora, filas aparte", () => {
    const other = { ...data, athleteEvents: [activity("a", "Valentina Soto"), activity("b", "Camila Rojas", { startTime: "20:00" })] };
    expect(eventRows(other, "2026-11-23", "2026-11-29").filter((r) => r.kind === "athletes")).toHaveLength(2);
  });

  it("textos de la hora y de la semana", () => {
    expect(hourLabel(match)).toBe("16:00, 120 min");
    expect(hourLabel({ allDay: true, startTime: null, durationMin: null })).toBe("Todo el día");
    expect(weekTitle("2026-11-26")).toBe("Semana del 23 al 29 nov");
    expect(weekTitle("2026-12-02")).toBe("Semana del 30 nov al 6 dic");
  });
});

describe("choque de carga del equipo", () => {
  it("el partido del equipo choca con las sesiones pesadas de cada atleta, no con lo de otros", () => {
    const sessions = [
      { id: "1", name: "Piernas", date: "2026-11-27", volume: 20 },
      { id: "2", name: "Potencia", date: "2026-11-28", volume: 20 },
      { id: "3", name: "Torso", date: "2026-11-23", volume: 8 },
    ];
    const events = eventsForClash(data, "b");
    expect(events.some((e) => e.title === "Viaje")).toBe(false);
    expect(clashLine("Camila Rojas", loadClashes(sessions, events))).toBe("Camila Rojas tiene partido el sábado y sesión el viernes y el sábado.");
  });
});

describe("formulario del evento", () => {
  const base = { ...emptyForm("2026-11-28"), title: " Partido " };

  it("al editar usa el inicio de la serie, no el día que se tocó", () => {
    expect(formOf(match).date).toBe("2026-11-21");
  });

  it("al repetir, el día de la fecha va siempre incluido y solo se apaga si es el único", () => {
    const withTuesday = toggleDay(base, 1);
    expect(repeatDaysOf(withTuesday)).toEqual([1, 5]);
    expect(toggleDay(withTuesday, 5)).toBe(withTuesday);
    const weekly = toggleDay(base, 5);
    expect(repeatDaysOf(weekly)).toEqual([5]);
    expect(toggleDay(weekly, 5).days).toEqual([]);
    expect(changeDate(weekly, "2026-11-29").days).toEqual([6]);
  });

  it("avisa antes de guardar lo que la API no acepta", () => {
    expect(formProblem(emptyForm("2026-11-28"))).toMatch("nombre");
    expect(formProblem({ ...base, duration: "90" })).toMatch("hora");
    expect(formProblem({ ...base, startTime: "10:00", duration: "601" })).toMatch("600");
    expect(formProblem({ ...base, days: [5], until: "2026-11-01" })).toMatch("repetición");
    expect(formProblem(base)).toBeNull();
  });

  it("todo el día no manda hora ni duración; sin días no hay repetición ni «hasta»", () => {
    expect(formPayload({ ...base, allDay: true, startTime: "10:00", duration: "60", until: "2026-12-31" })).toEqual({
      type: "match", title: "Partido", date: "2026-11-28", startTime: null, durationMin: null, allDay: true, notes: null, repeat: null,
    });
    expect(formPayload({ ...base, days: [5] }).repeat).toEqual({ days: [5], until: null });
  });
});

describe("ranking", () => {
  const row = (percent: number | null) => ({ athleteId: "x", name: "X", status: "active" as const, assigned: percent === null ? 0 : 4, completed: percent === null ? 0 : 3, percent });

  it("solo da puesto a quien tiene cifras y explica por qué otros no las tienen", () => {
    const rows = [row(90), row(0), row(null)];
    expect(rows.map((_, i) => rankOf(rows, i))).toEqual([1, 2, null]);
    expect(noFiguresLabel({ status: "pending" })).toBe("Invitación pendiente");
    expect(noFiguresLabel({ status: "inactive" })).toBe("Ya no es tu atleta");
    expect(noFiguresLabel({ status: "active" })).toBe("Sin sesiones en el período");
    expect(countsLabel(row(75))).toBe("3 de 4 sesiones completadas");
  });
});
