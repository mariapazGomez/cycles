import { athleteLoadView, calcLoadKg, athleteRmComment, formatLoad, formatPercentOfRm, rmStatusLabel, roundingNote } from "@cycles/shared";

describe("textos del RM", () => {
  it("formatea el peso con coma decimal y sin ceros de más", () => {
    expect(formatLoad(72.5)).toBe("72,5 kg");
    expect(formatLoad(80)).toBe("80 kg");
    expect(formatLoad(72.5, "lb")).toBe("159,8 lb");
  });
  it("arma el % y el comentario del atleta", () => {
    expect(formatPercentOfRm(80)).toBe("80 % de tu RM");
    expect(formatPercentOfRm(80, { short: true })).toBe("80 % RM");
    expect(athleteRmComment(80)).toBe("Estás levantando el 80 % de tu RM");
  });
  it("la nota del redondeo respeta la unidad", () => {
    expect(roundingNote()).toBe("Peso redondeado a 2,5 kg para que calce con los discos");
    expect(roundingNote("lb")).toBe("Peso redondeado a 5 lb para que calce con los discos");
  });
  it("el estado va en texto", () => {
    expect(rmStatusLabel("ok")).toBe("Lista");
    expect(rmStatusLabel("missing")).toBe("Falta RM");
    expect(rmStatusLabel("needs_athlete")).toBe("Falta RM");
    expect(rmStatusLabel(null)).toBeNull();
  });
  it("vista del atleta con y sin peso calculado", () => {
    expect(athleteLoadView({ percent: 80, resolvedWeightKg: 72.5, rmStatus: "ok", reps: 6 })).toEqual({
      goal: "6 × 72,5 kg", comment: "Estás levantando el 80 % de tu RM", note: "Peso redondeado a 2,5 kg para que calce con los discos", hasWeight: true,
    });
    expect(athleteLoadView({ percent: 80, resolvedWeightKg: null, rmStatus: "missing" })).toEqual({
      goal: null, comment: "Aún no hay peso calculado", note: null, hasWeight: false,
    });
  });
  it("calcula el peso de un % del RM, redondeado a 2,5 kg", () => {
    expect(calcLoadKg(80, 90)).toBe(72.5); // 72
    expect(calcLoadKg(75, 100)).toBe(75);
    expect(calcLoadKg(60, 100)).toBe(60);
    expect(calcLoadKg(82, 90)).toBe(75); // 73,8
    expect(calcLoadKg(80, 90, "lb")).toBeCloseTo(72.575, 2); // 160 lb
  });
});
