import { athletesCount, cycleWeekLabel, extraMembers, initialOf, initialsOf, matchesAthlete, teamAthleteState, teamColor } from "../src/lib/teams";

describe("equipos del coach: reglas puras", () => {
  it("textos de cantidad y avatares", () => {
    expect(athletesCount(1)).toBe("1 atleta");
    expect(athletesCount(12)).toBe("12 atletas");
    expect(extraMembers(12, 5)).toBe(7);
    expect(extraMembers(3, 5)).toBe(0);
    expect(initialOf("  voleibol sub-17")).toBe("V");
    expect(initialsOf("Valentina Soto Pérez")).toBe("VS");
  });
  it("el color sale de la inicial y es estable", () => {
    expect(teamColor("Voleibol")).toBe(teamColor("voleibol sub-17"));
    expect(teamColor("Fuerza")).toMatch(/^#[0-9a-f]{6}$/);
  });
  it("estado de cada atleta en el detalle", () => {
    expect(teamAthleteState({ relation: "pending", hasCycle: false, attentionCount: 0 })).toBe("pending");
    expect(teamAthleteState({ relation: "active", hasCycle: false, attentionCount: 0 })).toBe("no_cycle");
    expect(teamAthleteState({ relation: "active", hasCycle: true, attentionCount: 2 })).toBe("attention");
    expect(teamAthleteState({ relation: "active", hasCycle: true, attentionCount: 0 })).toBe("ok");
  });
  it("semana del ciclo: «Fuerza base, sem. 2»", () => {
    const cycle = { name: "Fuerza base", startDate: "2026-11-16T00:00:00.000Z", endDate: "2026-12-27T00:00:00.000Z" };
    expect(cycleWeekLabel(cycle, "2026-11-16")).toBe("Fuerza base, sem. 1");
    expect(cycleWeekLabel(cycle, "2026-11-25")).toBe("Fuerza base, sem. 2");
  });
  it("busca por nombre o email sin tildes ni mayúsculas", () => {
    expect(matchesAthlete({ name: "Matías Fuentes", email: "m@x.cl" }, "matias")).toBe(true);
    expect(matchesAthlete({ name: "Matías Fuentes", email: "m@x.cl" }, "M@X")).toBe(true);
    expect(matchesAthlete({ name: "Matías Fuentes", email: "m@x.cl" }, "camila")).toBe(false);
    expect(matchesAthlete({ name: "A", email: "a@a.a" }, "  ")).toBe(true);
  });
});
