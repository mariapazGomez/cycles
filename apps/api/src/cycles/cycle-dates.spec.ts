import { isValidRange, renumberForStart, sessionsOutside, startDateError, weeksOfCycle, CYCLE_DATE_MESSAGES } from "./cycle-dates";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const now = new Date("2026-11-25T15:00:00.000Z");

describe("inicio no anterior a hoy", () => {
  it("con la fecha del coach: ayer no, hoy y mañana sí", () => {
    expect(startDateError(d("2026-11-24"), "2026-11-25", now)).toBe(CYCLE_DATE_MESSAGES.beforeToday);
    expect(startDateError(d("2026-11-25"), "2026-11-25", now)).toBeNull();
    expect(startDateError(d("2026-11-26"), "2026-11-25", now)).toBeNull();
  });
  it("respeta la zona horaria del coach: su hoy puede ser el día anterior o el siguiente al UTC", () => {
    expect(startDateError(d("2026-11-24"), "2026-11-24", now)).toBeNull();
    expect(startDateError(d("2026-11-25"), "2026-11-26", now)).toBe(CYCLE_DATE_MESSAGES.beforeToday);
  });
  it("un «hoy» desfasado más de un día se rechaza", () => {
    expect(startDateError(d("2026-11-20"), "2026-11-20", now)).toBe(CYCLE_DATE_MESSAGES.badToday);
  });
  it("sin «hoy» (web antigua) tolera un día hacia atrás", () => {
    expect(startDateError(d("2026-11-24"), undefined, now)).toBeNull();
    expect(startDateError(d("2026-11-23"), undefined, now)).toBe(CYCLE_DATE_MESSAGES.beforeToday);
  });
});

describe("rango y semanas", () => {
  it("no hay ciclos de un solo día", () => {
    expect(isValidRange(d("2026-11-25"), d("2026-11-25"))).toBe(false);
    expect(isValidRange(d("2026-11-25"), d("2026-11-26"))).toBe(true);
  });
  it("las semanas cuentan desde el inicio con el último día incluido", () => {
    expect(weeksOfCycle(d("2026-11-25"), d("2026-12-01"))).toBe(1); // 7 días
    expect(weeksOfCycle(d("2026-11-25"), d("2026-12-02"))).toBe(2); // 8 días: el octavo es de la semana 2
    expect(weeksOfCycle(d("2026-11-30"), d("2026-12-27"))).toBe(4);
  });
});

const s = (id: string, weekNumber: number, slotNumber: number, day: string | null, deleted = false) => ({
  id, weekNumber, slotNumber, scheduledDate: day ? d(day) : null, deletedAt: deleted ? now : null,
});

describe("sesiones fuera del rango y renumeración", () => {
  it("detecta las que quedan antes, después o en una semana que ya no existe; ignora las borradas", () => {
    const out = sessionsOutside(
      [s("a", 1, 1, "2026-11-26"), s("b", 2, 1, "2026-12-03"), s("c", 3, 1, null), s("x", 9, 1, "2027-01-30", true)],
      { startDate: d("2026-11-27"), endDate: d("2026-12-10") },
    );
    expect(out.map((o) => o.id)).toEqual(["a", "c"]);
  });
  it("al mover el inicio recalcula la semana y no repite espacios, tampoco con las borradas", () => {
    const result = renumberForStart(
      [s("a", 1, 1, "2026-12-01"), s("b", 1, 2, "2026-12-02"), s("c", 2, 1, "2026-12-08"), s("gone", 1, 3, "2026-12-01", true), s("u", 2, 2, null)],
      d("2026-12-01"),
    );
    // La semana 1 va del 1 al 7 de diciembre; el 8 pasa a la semana 2.
    expect(result.get("a")).toEqual({ weekNumber: 1, slotNumber: 1 });
    expect(result.get("b")).toEqual({ weekNumber: 1, slotNumber: 2 });
    expect(result.get("gone")).toEqual({ weekNumber: 1, slotNumber: 3 });
    expect(result.get("c")).toEqual({ weekNumber: 2, slotNumber: 1 });
    expect(result.get("u")).toEqual({ weekNumber: 2, slotNumber: 2 });
    const keys = [...result.values()].map((v) => `${v.weekNumber}-${v.slotNumber}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
