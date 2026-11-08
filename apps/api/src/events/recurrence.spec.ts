import { BadRequestException } from "@nestjs/common";
import { datesInRange, expand, occursOn, parseRange, weekdayOf, type ExceptionRow, type SeriesRow } from "./recurrence";

// Repetición de las actividades paralelas (CYC-251): la regla, las excepciones y el rango.
const base = { type: "training" as const, sport: "volleyball" as const, title: "Voleibol", startTime: "19:00", durationMin: 90, allDay: false, intensity: "medium" as const, notes: null };
// 2026-11-02 es lunes.
const volei: SeriesRow = { ...base, id: "v", date: "2026-11-02", repeat: { days: [0, 1], until: "2026-11-24" } };
const none = new Map<string, ExceptionRow[]>();

describe("repetición", () => {
  it("0 es lunes y 6 domingo", () => {
    expect(weekdayOf("2026-11-02")).toBe(0);
    expect(weekdayOf("2026-11-08")).toBe(6);
  });

  it("expande lunes y martes hasta la fecha final, sin pasarse", () => {
    expect(datesInRange(volei, "2026-11-01", "2026-12-31")).toEqual(["2026-11-02", "2026-11-03", "2026-11-09", "2026-11-10", "2026-11-16", "2026-11-17", "2026-11-23", "2026-11-24"]);
  });

  it("sin fin sigue hasta el final del rango, y no hay días antes del inicio", () => {
    const open: SeriesRow = { ...volei, repeat: { days: [2], until: null } };
    expect(datesInRange(open, "2026-10-01", "2026-11-30")).toEqual(["2026-11-04", "2026-11-11", "2026-11-18", "2026-11-25"]);
  });

  it("solo devuelve los días del rango pedido (extremos incluidos)", () => {
    expect(datesInRange(volei, "2026-11-09", "2026-11-10")).toEqual(["2026-11-09", "2026-11-10"]);
    expect(datesInRange(volei, "2026-11-04", "2026-11-08")).toEqual([]);
  });

  it("una actividad que no se repite sale solo el día que es", () => {
    const one: SeriesRow = { ...volei, id: "x", date: "2026-11-07", repeat: null };
    expect(datesInRange(one, "2026-11-01", "2026-11-30")).toEqual(["2026-11-07"]);
    expect(datesInRange(one, "2026-11-08", "2026-11-30")).toEqual([]);
    expect(occursOn(one, "2026-11-07")).toBe(true);
    expect(occursOn(one, "2026-11-14")).toBe(false);
  });

  it("occursOn respeta el inicio, el fin y los días", () => {
    expect(occursOn(volei, "2026-11-09")).toBe(true);
    expect(occursOn(volei, "2026-11-11")).toBe(false);
    expect(occursOn(volei, "2026-10-26")).toBe(false);
    expect(occursOn(volei, "2026-12-01")).toBe(false);
  });
});

describe("excepciones y orden", () => {
  it("un día cancelado no sale y uno editado trae sus cambios con isException", () => {
    const exceptions = new Map<string, ExceptionRow[]>([
      ["v", [{ date: "2026-11-03", cancelled: true, overrides: null }, { date: "2026-11-09", cancelled: false, overrides: { startTime: "20:00", durationMin: 60, intensity: "low" } }]],
    ]);
    const list = expand([volei], exceptions, "2026-11-02", "2026-11-10");
    expect(list.map((o) => o.date)).toEqual(["2026-11-02", "2026-11-09", "2026-11-10"]);
    expect(list[0]).toMatchObject({ seriesId: "v", isException: false, startTime: "19:00" });
    expect(list[1]).toMatchObject({ isException: true, startTime: "20:00", durationMin: 60, intensity: "low", title: "Voleibol" });
    expect(list[1].repeat).toEqual(volei.repeat);
  });

  it("ordena por fecha, con los de todo el día primero y luego por hora", () => {
    const liga: SeriesRow = { ...base, id: "l", title: "Liga", type: "match", sport: null, date: "2026-11-02", startTime: null, durationMin: null, allDay: true, repeat: null };
    const tarde: SeriesRow = { ...base, id: "t", title: "Tarde", date: "2026-11-02", startTime: "18:00", repeat: null };
    const list = expand([volei, tarde, liga], none, "2026-11-02", "2026-11-02");
    expect(list.map((o) => o.seriesId)).toEqual(["l", "t", "v"]);
  });
});

describe("rango de consulta", () => {
  it("acepta hasta 92 días y rechaza más, al revés o con fechas inválidas", () => {
    expect(parseRange("2026-11-01", "2027-01-31")).toEqual({ from: "2026-11-01", to: "2027-01-31" });
    expect(() => parseRange("2026-11-01", "2027-02-01")).toThrow(BadRequestException);
    expect(() => parseRange("2026-11-10", "2026-11-01")).toThrow(BadRequestException);
    expect(() => parseRange("2026-02-30", "2026-03-01")).toThrow(BadRequestException);
    expect(() => parseRange(undefined, "2026-03-01")).toThrow(BadRequestException);
  });
});
