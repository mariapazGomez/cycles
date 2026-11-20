import { resolveLoad, roundLoadKg } from "./max";

describe("roundLoadKg", () => {
  it("redondea al múltiplo de 2,5 kg más cercano", () => {
    expect(roundLoadKg(81.2)).toBe(80);
    expect(roundLoadKg(81.3)).toBe(82.5);
    expect(roundLoadKg(83.75)).toBe(85);
    expect(roundLoadKg(1.2)).toBe(0);
  });

  it("con libras redondea a 5 lb y devuelve kg", () => {
    // 100 kg × 0,7 = 70 kg = 154,3 lb → 155 lb = 70,307 kg
    expect(roundLoadKg(70, "lb")).toBeCloseTo(70.307, 3);
    expect(roundLoadKg(45.359, "lb")).toBeCloseTo(45.359, 2); // 100 lb exactos
  });
});

describe("resolveLoad", () => {
  const base = { percent: 80, hasAthlete: true, frozenRmKg: null, currentRmKg: 100 };

  it("sin % no hay estado ni peso", () => {
    expect(resolveLoad({ ...base, percent: null })).toEqual({ rmStatus: null, resolvedWeightKg: null });
  });
  it("calcula el peso con el RM vigente", () => {
    expect(resolveLoad(base)).toEqual({ rmStatus: "ok", resolvedWeightKg: 80 });
    expect(resolveLoad({ ...base, percent: 77, currentRmKg: 102 })).toEqual({ rmStatus: "ok", resolvedWeightKg: 77.5 });
  });
  it("el RM congelado gana al vigente", () => {
    expect(resolveLoad({ ...base, frozenRmKg: 90, currentRmKg: 120 })).toEqual({ rmStatus: "ok", resolvedWeightKg: 72.5 });
  });
  it("sin RM avisa que falta, sin inventar un peso", () => {
    expect(resolveLoad({ ...base, currentRmKg: null })).toEqual({ rmStatus: "missing", resolvedWeightKg: null });
  });
  it("sin atleta (plantilla o rutina) pide un atleta", () => {
    expect(resolveLoad({ ...base, hasAthlete: false })).toEqual({ rmStatus: "needs_athlete", resolvedWeightKg: null });
  });
});
