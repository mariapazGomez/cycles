import { busyDays, daysInRange, durationText, pickDay, pickEnd, rangeForWeeks, rangeSummary, outsideWarning, EMPTY_RANGE } from "../src/lib/cycleRange";
import { totalWeeks } from "../src/lib/planGrid";

const today = "2026-11-25";

describe("elegir las fechas del ciclo", () => {
  it("un toque elige el primer día, otro el último y el tercero empieza otro rango", () => {
    const first = pickDay(EMPTY_RANGE, "2026-11-30", today);
    expect(first).toEqual({ start: "2026-11-30", end: null });
    const full = pickDay(first, "2026-12-27", today);
    expect(full).toEqual({ start: "2026-11-30", end: "2026-12-27" });
    expect(pickDay(full, "2026-12-01", today)).toEqual({ start: "2026-12-01", end: null });
  });
  it("no se eligen días pasados y no hay ciclos de un día", () => {
    expect(pickDay(EMPTY_RANGE, "2026-11-24", today)).toEqual(EMPTY_RANGE);
    const first = pickDay(EMPTY_RANGE, today, today);
    expect(pickDay(first, today, today)).toEqual(first);
    expect(pickDay({ start: "2026-12-05", end: null }, "2026-11-28", today)).toEqual({ start: "2026-11-28", end: null });
  });
  it("al editar un ciclo empezado los toques cambian solo el último día", () => {
    const r = { start: "2026-11-23", end: "2026-12-27" };
    expect(pickEnd(r, "2026-12-20")).toEqual({ start: "2026-11-23", end: "2026-12-20" });
    expect(pickEnd(r, "2026-11-23")).toEqual(r);
  });
  it("plantilla: el último día sale de las semanas", () => {
    expect(rangeForWeeks("2026-11-30", 5)).toEqual({ start: "2026-11-30", end: "2027-01-03" });
  });
  it("duración y resumen como en el diseño", () => {
    expect(durationText("2026-11-30", "2026-12-27")).toBe("4 semanas");
    expect(durationText("2026-11-23", "2026-12-09")).toBe("2 semanas y 3 días");
    expect(durationText("2026-11-26", "2026-11-27")).toBe("2 días");
    expect(daysInRange("2026-11-25", "2026-12-02")).toBe(8);
    expect(rangeSummary({ start: "2026-11-30", end: "2026-12-27" }, today)).toBe("Del lunes 30 nov al domingo 27 dic: 4 semanas");
    expect(rangeSummary({ start: "2026-11-30", end: "2027-01-03" }, today)).toContain("domingo 3 ene 2027: 5 semanas");
    expect(rangeSummary(EMPTY_RANGE, today)).toBe("Elige el primer día.");
  });
  it("marca los días de otros ciclos", () => {
    const days = busyDays([{ startDate: "2026-12-01T00:00:00.000Z", endDate: "2026-12-03T00:00:00.000Z" }]);
    expect([...days]).toEqual(["2026-12-01", "2026-12-02", "2026-12-03"]);
  });
});

describe("semanas del ciclo en la pizarra: ningún día queda oculto", () => {
  it("el octavo día abre la semana 2", () => {
    expect(totalWeeks("2026-11-25", "2026-12-01")).toBe(1);
    expect(totalWeeks("2026-11-25", "2026-12-02")).toBe(2);
    expect(totalWeeks("2026-11-30", "2026-12-27")).toBe(4);
    expect(totalWeeks("2026-11-30T00:00:00.000Z", "2027-01-03T00:00:00.000Z")).toBe(5);
  });
});

describe("sesiones que quedarían fuera", () => {
  const original = { start: "2026-11-23", end: "2026-12-06" };
  const sessions = [
    { weekNumber: 1, scheduledDate: "2026-11-26T00:00:00.000Z" },
    { weekNumber: 2, scheduledDate: "2026-11-30T00:00:00.000Z" },
    { weekNumber: 2, scheduledDate: "2026-12-02T00:00:00.000Z" },
    { weekNumber: 2, scheduledDate: "2026-12-04T00:00:00.000Z" },
  ];

  it("al acortar dice hasta qué día, cuántas y en qué fechas", () => {
    expect(outsideWarning(sessions, { start: "2026-11-23", end: "2026-11-29" }, original)).toBe(
      "No puedes acortar el ciclo hasta el 29 nov: quedan 3 sesiones fuera (lunes 30 nov, miércoles 2 y viernes 4 dic). Muévelas o quítalas primero.",
    );
  });

  it("al mover el inicio habla de cambiar las fechas, en singular si es una", () => {
    expect(outsideWarning(sessions, { start: "2026-11-27", end: "2026-12-06" }, original)).toBe(
      "No puedes cambiar las fechas: queda 1 sesión fuera (jueves 26 nov). Muévela o quítala primero.",
    );
  });

  it("sin cambios de fecha o con todo dentro no avisa; sin fecha cuenta la semana", () => {
    expect(outsideWarning(sessions, original, original)).toBeNull();
    expect(outsideWarning(sessions, { start: "2026-11-23", end: "2026-12-20" }, original)).toBeNull();
    expect(outsideWarning([{ weekNumber: 2, scheduledDate: null }], { start: "2026-11-23", end: "2026-11-29" }, original)).toBe(
      "No puedes acortar el ciclo hasta el 29 nov: queda 1 sesión fuera. Muévela o quítala primero.",
    );
  });
});
