import { plannedRestSeconds } from "../src/lib/restPlan";

// CYC-285: no hay descanso por defecto; solo corre el que planificó el coach.
describe("plannedRestSeconds", () => {
  it("sin descanso planificado (falta o es nulo) es 0, no 90", () => {
    expect(plannedRestSeconds(undefined)).toBe(0);
    expect(plannedRestSeconds(null)).toBe(0);
  });
  it("0 significa sin descanso", () => {
    expect(plannedRestSeconds(0)).toBe(0);
  });
  it("valores inválidos no abren descanso", () => {
    expect(plannedRestSeconds(-30)).toBe(0);
    expect(plannedRestSeconds(Number.NaN)).toBe(0);
  });
  it("respeta el descanso planificado", () => {
    expect(plannedRestSeconds(45)).toBe(45);
    expect(plannedRestSeconds(90)).toBe(90);
  });
});
