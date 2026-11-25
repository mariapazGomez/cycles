import { cycleProgress, eventLines, gmtLabel, sessionBadge, sessionCards } from "../src/lib/teamCalendar";
import type { BoardSession } from "../src/lib/weekBoard";

const s = (id: string, name: string, status: BoardSession["status"], dayIso = "2026-11-16"): BoardSession => ({ id, name, status, dayIso, pain: false });

describe("calendario del equipo", () => {
  it("agrupa la misma sesión de varios atletas y cuenta quiénes la hicieron", () => {
    const cards = sessionCards(
      [
        { athleteId: "a", sessions: [s("1", "Piernas base", "completed")] },
        { athleteId: "b", sessions: [s("2", "piernas base", "pending"), s("3", "Torso", "completed")] },
        { athleteId: "c", sessions: [s("4", "Piernas base", "completed", "2026-11-18")] },
      ],
      "2026-11-16",
    );
    expect(cards.map((c) => [c.name, c.done, c.total])).toEqual([
      ["Piernas base", 1, 2],
      ["Torso", 1, 1],
    ]);
  });

  it("la etiqueta: «Pendiente» si aún nadie la hizo y no pasó; si no, «N de M»", () => {
    expect(sessionBadge({ done: 0, total: 12 }, "2026-11-27", "2026-11-25")).toEqual({ text: "Pendiente", tone: "pending" });
    expect(sessionBadge({ done: 0, total: 12 }, "2026-11-25", "2026-11-25").text).toBe("Pendiente");
    expect(sessionBadge({ done: 0, total: 12 }, "2026-11-20", "2026-11-25")).toEqual({ text: "0 de 12", tone: "warn" });
    expect(sessionBadge({ done: 12, total: 12 }, "2026-11-18", "2026-11-25")).toEqual({ text: "12 de 12", tone: "ok" });
    expect(sessionBadge({ done: 7, total: 12 }, "2026-11-25", "2026-11-25")).toEqual({ text: "7 de 12", tone: "warn" });
  });

  it("lo que agregaron los atletas va en una línea por tipo", () => {
    const ev = (type: string, date: string) => ({ type, date }) as never;
    const lines = eventLines(
      [
        { athleteId: "m", athleteName: "Matías Vera", events: [ev("travel", "2026-11-26"), ev("rest", "2026-11-29")] },
        { athleteId: "v", athleteName: "Valentina Soto", events: [ev("rest", "2026-11-29")] },
      ],
      "2026-11-26",
    );
    expect(lines).toEqual(["Viaje: Matías"]);
    expect(eventLines([{ athleteId: "m", athleteName: "Matías", events: [ev("rest", "2026-11-29")] }, { athleteId: "v", athleteName: "V", events: [ev("rest", "2026-11-29")] }], "2026-11-29")).toEqual(["Descanso: 2"]);
  });

  it("zona horaria y avance del ciclo", () => {
    expect(gmtLabel(180)).toBe("GMT-3");
    expect(gmtLabel(0)).toBe("GMT");
    expect(gmtLabel(-330)).toBe("GMT+5:30");
    const cycle = { startDate: "2026-11-16", endDate: "2026-12-27" };
    expect(cycleProgress(cycle, "2026-11-25")).toEqual({ week: 2, total: 6, percent: 33 });
    expect(cycleProgress(cycle, "2027-02-01").week).toBe(6);
  });
});
