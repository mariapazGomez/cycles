import { openCardKey, todayCards, upcomingDayLabel } from "../src/lib/todayCycles";
import { cycleCardData, liveCycles } from "../src/lib/weekBoard";
import type { TodayCycleEntry } from "../src/services/executionApi";

const session = (id: string, startedAt: string | null = null) => ({ id, name: id, startedAt }) as TodayCycleEntry["pending"][number];
const entry = (name: string, over: Partial<TodayCycleEntry> = {}): TodayCycleEntry => ({
  cycle: { id: name, name, currentWeek: 1 },
  pending: [session(`${name}-1`)],
  upcoming: false,
  done: [],
  ...over,
});
const done = (id: string) => [{ id, name: id, weekNumber: 1, slotNumber: 1, exercises: { done: 1, total: 1 } }];

const TODAY = "2026-11-25";

describe("«Hoy» con dos ciclos", () => {
  it("dos pendientes: las dos tarjetas y va abierta la primera", () => {
    const cards = todayCards([entry("a"), entry("b")], TODAY);
    expect(cards.map((c) => [c.kind, c.key])).toEqual([
      ["pending", "a-1"],
      ["pending", "b-1"],
    ]);
    expect(openCardKey(cards)).toBe("a-1");
  });

  it("si una está empezada, esa va arriba y abierta", () => {
    const cards = todayCards([entry("a"), entry("b", { pending: [session("b-1", "2026-11-25T10:00:00Z")] })], TODAY);
    expect(cards[0].key).toBe("b-1");
    expect(openCardKey(cards)).toBe("b-1");
  });

  it("una atrasada no se presenta como de hoy y va después de las de hoy", () => {
    const dated = (id: string, day: string) => ({ ...session(id), scheduledDate: `${day}T00:00:00.000Z` });
    const cards = todayCards([entry("a", { pending: [dated("a-1", "2026-11-18")] }), entry("b", { pending: [dated("b-1", TODAY)] })], TODAY);
    expect(cards.map((c) => [c.kind, c.key])).toEqual([
      ["pending", "b-1"],
      ["overdue", "a-1"],
    ]);
  });

  it("una hecha y la otra sin sesión hoy: hecha compacta y la próxima, sin abrir ninguna", () => {
    const cards = todayCards([entry("a", { upcoming: true, done: done("a-0") }), entry("b", { upcoming: true })], TODAY);
    expect(cards.map((c) => [c.kind, c.key])).toEqual([
      ["done", "a-0"],
      ["upcoming", "b-1"],
    ]);
    expect(openCardKey(cards)).toBeNull();
  });

  it("lo que está por hacer va antes que lo hecho", () => {
    const cards = todayCards([entry("a", { pending: [], done: done("a-0") }), entry("b")], TODAY);
    expect(cards.map((c) => c.key)).toEqual(["b-1", "a-0"]);
  });

  it("con una hecha hoy, ese ciclo solo suma otra tarjeta si también es de hoy", () => {
    const dated = (id: string, day: string) => ({ ...session(id), scheduledDate: `${day}T00:00:00.000Z` });
    const atrasada = todayCards([entry("a", { pending: [dated("a-1", "2026-11-18")], done: done("a-0") })], TODAY);
    expect(atrasada.map((c) => c.key)).toEqual(["a-0"]);
    const deHoy = todayCards([entry("a", { pending: [dated("a-1", TODAY)], done: done("a-0") })], TODAY);
    expect(deHoy.map((c) => c.key)).toEqual(["a-1", "a-0"]);
  });

  it("el día de la próxima lleva el mes solo si es otro", () => {
    expect(upcomingDayLabel("2026-11-27T00:00:00.000Z", "2026-11-25")).toBe("Viernes 27");
    expect(upcomingDayLabel("2026-12-04", "2026-11-25")).toBe("Viernes 4 dic");
  });
});

describe("tarjeta del atleta con varios ciclos", () => {
  const s = (id: string, day: string, status: "pending" | "completed" | "skipped" = "pending") => ({
    id,
    name: id,
    status,
    weekNumber: 1,
    slotNumber: 1,
    scheduledDate: `${day}T00:00:00.000Z`,
  });

  it("arma la semana y cuenta las completadas de las asignadas en las últimas 4 semanas", () => {
    const at = (id: string, day: string, weekNumber: number, status: "pending" | "completed" = "pending") => ({ ...s(id, day, status), weekNumber });
    const data = cycleCardData(
      "2026-10-26",
      0,
      [
        at("fuera", "2026-10-26", 1, "completed"),
        at("hace3", "2026-11-02", 2, "completed"),
        at("lun", "2026-11-23", 5, "completed"),
        at("mie", "2026-11-25", 5),
        at("vie", "2026-11-27", 5),
        at("otra", "2026-11-30", 6),
      ],
      "2026-11-23",
    );
    expect([data.done, data.of]).toEqual([2, 4]);
    expect(data.week.map((x) => x.id)).toEqual(["lun", "mie", "vie"]);
  });

  it("solo los ciclos activos que corren esta semana, del que empezó antes", () => {
    const c = (id: string, startDate: string, endDate: string, status = "active", cycleType = "mesocycle") => ({ id, startDate, endDate, status, cycleType });
    const list = [
      c("nuevo", "2026-11-25", "2026-12-20"),
      c("viejo", "2026-11-02", "2026-11-29"),
      c("terminado", "2026-10-01", "2026-11-01"),
      c("futuro", "2026-12-07", "2026-12-20"),
      c("archivado", "2026-11-02", "2026-12-20", "archived"),
      c("macro", "2026-11-02", "2027-02-01", "active", "macrocycle"),
    ];
    expect(liveCycles(list, "2026-11-23").map((x) => x.id)).toEqual(["viejo", "nuevo"]);
  });
});
