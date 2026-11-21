import { buildPreview, cycleForDate, missingRmCount } from "../src/lib/addToMany";

const cycles = [
  { id: "c1", athleteId: "a1", startDate: "2026-11-01", endDate: "2026-11-30" },
  { id: "c2", athleteId: "a2", startDate: "2026-12-01T00:00:00.000Z", endDate: "2026-12-31T00:00:00.000Z" },
  { id: "t1", athleteId: "a1", isTemplate: true, startDate: "2026-11-01", endDate: "2026-11-30" },
];

describe("agregar una rutina a varios atletas", () => {
  it("elige el ciclo del atleta que contiene la fecha, ignorando plantillas", () => {
    expect(cycleForDate(cycles, "a1", "2026-11-20")?.id).toBe("c1");
    expect(cycleForDate(cycles, "a2", "2026-11-20")).toBeNull();
    expect(cycleForDate(cycles, "a2", "2026-12-31")?.id).toBe("c2");
  });
  it("calcula el peso de cada atleta o lo deja sin peso si falta el RM", () => {
    const rows = buildPreview({
      candidates: [{ athleteId: "a1", name: "Valentina" }, { athleteId: "a2", name: "Camila" }],
      cycles,
      date: "2026-11-20",
      percentExercises: [{ exerciseId: "sq", name: "Sentadilla", percent: 80 }, { exerciseId: "dl", name: "Peso muerto", percent: 70 }],
      rmByAthlete: new Map([["a1", new Map([["sq", 90], ["dl", 110]])], ["a2", new Map([["sq", 80]])]]),
    });
    expect(rows[0].cells.map((c) => c.kg)).toEqual([72.5, 77.5]);
    expect(rows[0].missingRm).toBe(false);
    expect(rows[0].cycleId).toBe("c1");
    expect(rows[1].cells.map((c) => c.kg)).toEqual([65, null]);
    expect(rows[1].missingRm).toBe(true);
    expect(rows[1].cycleId).toBeNull();
    expect(missingRmCount(rows)).toEqual({ missing: 1, total: 2 });
  });
  it("sin ejercicios con %, a nadie le falta RM", () => {
    const rows = buildPreview({ candidates: [{ athleteId: "a1", name: "V" }], cycles, date: "2026-11-20", percentExercises: [], rmByAthlete: new Map() });
    expect(rows[0].missingRm).toBe(false);
  });
});
