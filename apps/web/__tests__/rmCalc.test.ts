import { epleyRm, epleyStepsText } from "../src/lib/rmCalc";

describe("RM aproximado (Epley)", () => {
  it("60 kg × 10 reps da 80 kg, como en el diseño", () => {
    const r = epleyRm(60, 10);
    expect(r?.rmKg).toBe(80);
    expect(r?.factor).toBe(1.33);
    expect(r?.imprecise).toBe(false);
  });
  it("la tabla del diseño con 60 kg: 62, 66, 70, 76 y 80", () => {
    expect([1, 3, 5, 8, 10].map((n) => epleyRm(60, n)?.rmKg)).toEqual([60, 66, 70, 76, 80]);
  });
  it("con 1 repetición el RM es el propio peso", () => {
    expect(epleyRm(72.5, 1)?.rmKg).toBe(72.5);
  });
  it("redondea al 0,5 kg más cercano", () => {
    expect(epleyRm(45, 8)?.rmKg).toBe(57);
    expect(epleyRm(47, 5)?.rmKg).toBe(55); // 54,83
    expect(epleyRm(46, 5)?.rmKg).toBe(53.5); // 53,67
  });
  it("avisa que es poco preciso sobre 10 repeticiones", () => {
    expect(epleyRm(40, 12)?.imprecise).toBe(true);
  });
  it("rechaza repeticiones fuera de 1–15 y pesos no válidos", () => {
    expect(epleyRm(60, 0)).toBeNull();
    expect(epleyRm(60, 16)).toBeNull();
    expect(epleyRm(60, 2.5)).toBeNull();
    expect(epleyRm(0, 5)).toBeNull();
    expect(epleyRm(NaN, 5)).toBeNull();
  });
  it("muestra la cuenta paso a paso", () => {
    const r = epleyRm(60, 10)!;
    expect(epleyStepsText(60, 10, r)).toBe("60 × (1 + 10 ÷ 30) = 60 × 1,33 = 80 kg");
  });
});
