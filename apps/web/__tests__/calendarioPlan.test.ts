import { activeCycleOn, athleteMarks, bandSegments, crossingCycles, dayRule, hasOpenCycle, pickableDays, planBadge, planBlock } from "../src/lib/teamPlanCalendar";

const today = "2026-11-26";
const cycle = (id: string, startDate: string, endDate: string, status: "active" | "completed" | "archived" = "active") => ({ id, name: id, startDate, endDate, status });
const base = cycle("base", "2026-11-16", "2026-12-13");
const next = cycle("next", "2026-12-21", "2027-01-17");

describe("planificar desde el calendario del equipo", () => {
  it("toma todos los ciclos que cruzan lo que se ve, sin los archivados", () => {
    const old = cycle("old", "2026-09-01", "2026-09-30");
    const hidden = cycle("hidden", "2026-11-01", "2026-11-30", "archived");
    expect(crossingCycles([next, base, old, hidden], "2026-11-01", "2026-12-31").map((c) => c.id)).toEqual(["base", "next"]);
  });

  it("un día pasado o sin ciclo no acepta rutinas", () => {
    expect(dayRule([base, next], "2026-11-24", today)).toBe("past");
    expect(dayRule([base, next], "2026-11-26", today)).toBe("ok");
    expect(dayRule([base, next], "2026-12-17", today)).toBe("none");
    expect(dayRule([cycle("x", "2026-11-16", "2026-12-13", "completed")], "2026-11-30", today)).toBe("none");
    expect(activeCycleOn([base, next], "2026-12-22")?.id).toBe("next");
  });

  it("sabe si queda algún ciclo donde planificar", () => {
    expect(hasOpenCycle([base], today)).toBe(true);
    expect(hasOpenCycle([cycle("old", "2026-09-01", "2026-09-30")], today)).toBe(false);
    expect(hasOpenCycle([], today)).toBe(false);
  });

  it("«Llega a N» hasta que alguien la hace; después «N de M»", () => {
    const s = (scheduledDate: string, completed: number) => ({ scheduledDate, recipients: 10, completed });
    expect(planBadge(s("2026-11-28", 0), today)).toEqual({ text: "Llega a 10", tone: "pending" });
    expect(planBadge(s("2026-11-26", 0), today).text).toBe("Llega a 10");
    expect(planBadge(s("2026-11-26", 3), today)).toEqual({ text: "3 de 10", tone: "warn" });
    expect(planBadge(s("2026-11-19", 10), today)).toEqual({ text: "10 de 10", tone: "ok" });
    expect(planBadge(s("2026-11-19", 0), today).text).toBe("0 de 10");
  });

  it("solo con «Eventos del equipo» no se asignan rutinas; en la semana no hay filtro", () => {
    expect(planBlock({ mode: "month", typeFilter: "team" })).toBe("Muestra las sesiones para asignar rutinas.");
    expect(planBlock({ mode: "month", typeFilter: "sessions" })).toBeNull();
    expect(planBlock({ mode: "week", typeFilter: "team" })).toBeNull();
  });

  it("las marcas de la semana son solo del plan del equipo, en el día de cada copia", () => {
    const copy = (athleteId: string, scheduledDate: string | null, status: "pending" | "completed" = "pending") => ({ sessionId: `${athleteId}-x`, athleteId, status, adjusted: false, scheduledDate, skip: null });
    const details = [
      { sessions: [{ name: "Fuerza", scheduledDate: "2026-11-26T00:00:00.000Z", copies: [copy("a", "2026-11-26T00:00:00.000Z", "completed"), copy("b", "2026-11-28T00:00:00.000Z"), copy("c", null)] }] },
    ] as never;
    expect(athleteMarks(details, "a", "2026-11-26")).toEqual([{ id: "a-x", name: "Fuerza", status: "completed" }]);
    // La que movió aparece en su día, no en el del plan.
    expect(athleteMarks(details, "b", "2026-11-26")).toEqual([]);
    expect(athleteMarks(details, "b", "2026-11-28")).toHaveLength(1);
    // Sin día propio, va en el del plan. Quien no tiene copia, queda vacío.
    expect(athleteMarks(details, "c", "2026-11-26")).toHaveLength(1);
    expect(athleteMarks(details, "nadie", "2026-11-26")).toEqual([]);
  });

  it("la barra va un tramo por semana, con borde solo donde el ciclo empieza o termina", () => {
    const week = (first: number) => Array.from({ length: 7 }, (_, i) => `2026-12-${String(first + i).padStart(2, "0")}`);
    const brief = (segments: ReturnType<typeof bandSegments<typeof base>>) => segments.map((x) => [x.cycle.id, x.from, x.to, x.starts, x.ends]);
    // 7–13 dic: termina «base» el domingo 13.
    expect(brief(bandSegments([next, base], week(7)))).toEqual([["base", 1, 7, false, true]]);
    expect(bandSegments([base, next], week(14))).toEqual([]);
    // 21–27 dic: empieza «next» y sigue.
    expect(brief(bandSegments([base, next], week(21)))).toEqual([["next", 1, 7, true, false]]);
    // Dos en la misma fila, con hueco; los archivados no salen.
    const short = cycle("corto", "2026-12-18", "2026-12-20");
    const done = cycle("terminado", "2026-12-14", "2026-12-15", "completed");
    expect(brief(bandSegments([short, done, cycle("fuera", "2026-12-14", "2026-12-20", "archived")], week(14)))).toEqual([
      ["terminado", 1, 2, true, true],
      ["corto", 5, 7, true, true],
    ]);
  });

  it("sin arrastrar ofrece desde hoy los días de los ciclos abiertos", () => {
    const one = pickableDays([base], today);
    expect(one[0]).toMatchObject({ label: "Semana 2" });
    expect(one[0].days[0]).toBe(today);
    expect(one.flatMap((w) => w.days).at(-1)).toBe("2026-12-13");
    expect(pickableDays([next, base], today).at(-1)!.label).toBe("next, semana 4");
  });
});
