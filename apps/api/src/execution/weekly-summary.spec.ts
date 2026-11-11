import { weeklySummaryEmptyFixture, weeklySummaryFixture } from "../../../../packages/shared/src/fixtures/weeklySummary";
import { buildWeeklySummary, type RawWeeklySession } from "./weekly-summary";

// Ciclo que empieza el lunes 9 de noviembre de 2026: la semana 1 del plan es la del 9 al 15.
const start = new Date(Date.UTC(2026, 10, 9));
const week = (n: number) => new Date(Date.UTC(2026, 10, 9 + (n - 1) * 7));
const s = (over: Partial<RawWeeklySession> = {}): RawWeeklySession => ({ cycleStart: start, weekNumber: 1, status: "pending", feedback: null, ...over });
const done = (minutes: number | null, srpe: number | null, over: Partial<RawWeeklySession> = {}) =>
  s({ status: "completed", feedback: { durationMinutes: minutes, srpe }, ...over });

describe("buildWeeklySummary (CYC-261)", () => {
  it("cuenta planeadas y hechas, suma el tiempo y promedia el esfuerzo", () => {
    const r = buildWeeklySummary(week(1), [done(50, 6), done(45, 7), s()]);
    expect(r).toEqual({ weekStart: "2026-11-09", weekEnd: "2026-11-15", sessionsPlanned: 3, sessionsDone: 2, minutesTrained: 95, averageSrpe: 6.5 });
  });

  it("una sesión hecha en otra semana cuenta en la semana en que estaba planeada", () => {
    const rows = [done(40, 5, { weekNumber: 1 }), s({ weekNumber: 2 })];
    expect(buildWeeklySummary(week(1), rows)).toMatchObject({ sessionsPlanned: 1, sessionsDone: 1, minutesTrained: 40 });
    expect(buildWeeklySummary(week(2), rows)).toMatchObject({ sessionsPlanned: 1, sessionsDone: 0, minutesTrained: null });
  });

  it("sin ciclo o fuera de su rango da ceros y null, sin inventar datos", () => {
    expect(buildWeeklySummary(week(1), [])).toMatchObject({ sessionsPlanned: 0, sessionsDone: 0, minutesTrained: null, averageSrpe: null });
    expect(buildWeeklySummary(week(9), [s()])).toMatchObject({ sessionsPlanned: 0 });
  });

  it("una sesión hecha sin tiempo o sin esfuerzo no se cuenta en ese promedio", () => {
    const r = buildWeeklySummary(week(1), [done(null, null), done(30, 8)]);
    expect(r).toMatchObject({ sessionsDone: 2, minutesTrained: 30, averageSrpe: 8 });
  });

  it("las omitidas cuentan como planeadas, no como hechas ni en el tiempo", () => {
    const r = buildWeeklySummary(week(1), [s({ status: "skipped" }), done(20, 4)]);
    expect(r).toMatchObject({ sessionsPlanned: 2, sessionsDone: 1, minutesTrained: 20 });
  });

  it("redondea el esfuerzo medio a un decimal", () => {
    expect(buildWeeklySummary(week(1), [done(10, 6), done(10, 7), done(10, 7)]).averageSrpe).toBe(6.7);
  });
});

describe("contrato con la app móvil (CYC-261)", () => {
  it("lo que produce el código real coincide con el fixture que usa la app", () => {
    expect(buildWeeklySummary(week(1), [done(50, 6), done(45, 7), s()])).toEqual(weeklySummaryFixture);
    expect(buildWeeklySummary(week(2), [])).toEqual({ ...weeklySummaryEmptyFixture, weekStart: "2026-11-16", weekEnd: "2026-11-22" });
  });
});
