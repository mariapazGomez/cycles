import { effectiveTargetWeight, loadLabel, percentLoadView } from "../src/lib/rmLoad";

describe("carga en Hoy y registro (peso fijo o % del RM)", () => {
  it("peso fijo y peso corporal siguen igual", () => {
    expect(loadLabel({ targetWeight: 60 })).toBe("60 kg");
    expect(loadLabel({ targetWeight: null })).toBe("Peso corporal");
    expect(effectiveTargetWeight({ targetWeight: 60 })).toBe(60);
  });
  it("con RM muestra el peso calculado", () => {
    const se = { targetPercentRm: 80, rmStatus: "ok" as const, resolvedWeightKg: 72.5 };
    expect(loadLabel(se)).toBe("72,5 kg");
    expect(effectiveTargetWeight(se)).toBe(72.5);
    expect(percentLoadView(se, 6)).toMatchObject({ goal: "6 × 72,5 kg", comment: "Estás levantando el 80 % de tu RM", hasWeight: true });
  });
  it("sin RM muestra el % y deja el peso en blanco", () => {
    const se = { targetPercentRm: 75, rmStatus: "missing" as const, resolvedWeightKg: null };
    expect(loadLabel(se)).toBe("75 % de tu RM");
    expect(effectiveTargetWeight(se)).toBeNull();
    expect(percentLoadView(se)).toMatchObject({ comment: "Aún no hay peso calculado", hasWeight: false });
  });
});
