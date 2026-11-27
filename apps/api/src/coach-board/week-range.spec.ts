import { plannedCalendarWeek, planWeekStart } from "../common/training";
import { weekClauses, weeksStartingBetween, weeksTouching } from "./week-range";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const DAY_MS = 86_400_000;
const plus = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS);

describe("semanas del plan en un tramo de fechas", () => {
  // Contra la definición directa, con inicios en cualquier día de la semana y con hora.
  it("coincide con revisar semana por semana", () => {
    const from = d("2026-11-16");
    const to = d("2026-11-29");
    for (let offset = -80; offset <= 40; offset += 1) {
      const start = plus(from, offset);
      const touching: number[] = [];
      const starting: number[] = [];
      for (let week = 1; week <= 30; week += 1) {
        const first = planWeekStart(start, week);
        if (first <= to && plus(first, 6) >= from) touching.push(week);
        if (first >= from && first <= to) starting.push(week);
      }
      const asRange = (weeks: number[]) => (weeks.length ? { gte: weeks[0], lte: weeks[weeks.length - 1] } : null);
      const withTime = new Date(start.getTime() + 15 * 3_600_000);
      expect(weeksTouching(withTime, from, to)).toEqual(asRange(touching));
      expect(weeksStartingBetween(withTime, from, to)).toEqual(asRange(starting));
    }
  });

  it("las semanas que empiezan en el tramo son las que cuenta el resumen del atleta", () => {
    // Cuatro semanas calendario desde un lunes: las del resumen (CYC-261).
    const firstMonday = d("2026-11-02");
    const lastSunday = d("2026-11-29");
    const start = d("2026-10-22");
    const range = weeksStartingBetween(start, firstMonday, lastSunday)!;
    for (let week = 1; week <= 12; week += 1) {
      const counted = plannedCalendarWeek(start, week);
      expect(week >= range.gte && week <= range.lte).toBe(counted >= firstMonday && counted <= lastSunday);
    }
  });

  it("agrupa los ciclos con las mismas semanas y omite los que no tienen ninguna", () => {
    const cycles = [
      { id: "a", startDate: d("2026-11-02") },
      { id: "b", startDate: d("2026-11-02") },
      { id: "c", startDate: d("2026-10-05") },
      { id: "d", startDate: d("2027-03-01") },
    ];
    expect(weekClauses(cycles, (c) => weeksTouching(c.startDate, d("2026-11-23"), d("2026-11-29")))).toEqual([
      { cycleId: { in: ["a", "b"] }, weekNumber: { gte: 4, lte: 4 } },
      { cycleId: { in: ["c"] }, weekNumber: { gte: 8, lte: 8 } },
    ]);
  });
});
