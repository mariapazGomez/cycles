import { ATHLETE_MARKS, ATHLETE_STEP_COUNT, athleteMark } from "../src/lib/tourMarks";

// CYC-233: la guía del atleta son tres marcas sobre el menú, no una lista fija.
const ctx = { path: "/", has: () => true, count: () => 0, value: () => "", athleteId: null, athleteName: null, pendingName: null, summarySeen: false };

describe("guía del atleta en la web (CYC-233)", () => {
  it("tiene tres pasos sobre Hoy, Calendario y Mis ciclos, en ese orden", () => {
    expect(ATHLETE_STEP_COUNT).toBe(3);
    expect(ATHLETE_MARKS.map((m) => m.selector(ctx))).toEqual([
      '[data-tour="athlete-today"]',
      '[data-tour="athlete-calendar"]',
      '[data-tour="athlete-cycles"]',
    ]);
  });

  it("los dos primeros avanzan con «Siguiente» y el último cierra con «Entendido»", () => {
    expect(ATHLETE_MARKS.map((m) => [m.manual === true, m.closing === true])).toEqual([
      [true, false],
      [true, false],
      [false, true],
    ]);
  });

  it("funciona igual sin ciclo asignado: no depende de ningún dato", () => {
    for (const mark of ATHLETE_MARKS) expect(mark.when({ ...ctx, has: () => false })).toBe(true);
  });

  it("los textos tutean y no usan voseo", () => {
    const text = ATHLETE_MARKS.map((m) => m.text(ctx)).join(" ");
    expect(text).toMatch(/tu sesión|tu semana|tu coach/);
    expect(text).not.toMatch(/\b(tocá|vos|tenés|podés)\b/i);
  });

  it("pide la marca por número de paso", () => {
    expect(athleteMark(2)?.id).toBe("a2");
    expect(athleteMark(4)).toBeNull();
  });
});
