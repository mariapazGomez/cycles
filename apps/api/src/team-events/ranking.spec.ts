import { countSessions, percentOf, sortRanking, type RankingCycle } from "./ranking";

// Miércoles 25-11-2026: la semana en curso parte el lunes 23.
const NOW = new Date("2026-11-25T15:00:00Z");
const utc = (d: string) => new Date(`${d}T00:00:00Z`);
const s = (weekNumber: number, status: "pending" | "completed" | "skipped" = "pending") => ({ weekNumber, status });
const cycle = (over: Partial<RankingCycle> = {}): RankingCycle => ({
  status: "active",
  startDate: utc("2026-10-19"),
  endDate: utc("2026-12-13"),
  // Semana 1 = 19-10 … semana 6 = 23-11 (la actual), semana 7 = 30-11.
  sessions: [s(1, "completed"), s(3, "completed"), s(5, "skipped"), s(6, "completed"), s(6), s(7, "completed")],
  ...over,
});

describe("ranking del equipo", () => {
  it("«últimas 4 semanas»: las 4 semanas calendario con la actual entera; nada futuro", () => {
    expect(countSessions([cycle()], "weeks4", NOW)).toEqual({ assigned: 4, completed: 2 });
  });

  it("«este ciclo»: desde el inicio hasta la semana en curso, solo ciclos activos que incluyen hoy", () => {
    expect(countSessions([cycle()], "cycle", NOW)).toEqual({ assigned: 5, completed: 3 });
    expect(countSessions([cycle({ status: "completed" }), cycle({ endDate: utc("2026-11-20") })], "cycle", NOW)).toEqual({ assigned: 0, completed: 0 });
  });

  it("ordena por porcentaje, luego completadas y nombre; sin sesiones al final", () => {
    const row = (name: string, completed: number, assigned: number) => ({ athleteId: name, name, status: "active" as const, completed, assigned, percent: percentOf(completed, assigned) });
    expect(sortRanking([row("Zoe", 0, 0), row("Beto", 1, 2), row("Ana", 2, 4), row("Carla", 3, 3), row("Dani", 1, 2)]).map((r) => r.name)).toEqual(["Carla", "Ana", "Beto", "Dani", "Zoe"]);
  });
});
