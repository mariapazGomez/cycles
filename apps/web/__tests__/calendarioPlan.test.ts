import { activeCycleOn, crossingCycles, cycleReach, dayRule, hasOpenCycle, ownSessions, pickableDays, planBadge, planBlock } from "../src/lib/teamPlanCalendar";
import type { BoardSession } from "../src/lib/weekBoard";

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

  it("con filtros que no dejan asignar, dice por qué; en la semana no hay filtros", () => {
    expect(planBlock({ mode: "month", personId: "a", typeFilter: "all" })).toMatch(/Todas las personas/);
    expect(planBlock({ mode: "month", personId: "", typeFilter: "events" })).toBe("Muestra las sesiones para asignar rutinas.");
    expect(planBlock({ mode: "month", personId: "", typeFilter: "sessions" })).toBeNull();
    expect(planBlock({ mode: "week", personId: "a", typeFilter: "events" })).toBeNull();
  });

  it("no repite las copias del plan, ajustadas o no, y trata aparte las de otro equipo", () => {
    const s = (id: string, teamSessionId?: string, teamCycleId?: string): BoardSession => ({ id, name: id, status: "pending", dayIso: today, pain: false, teamSessionId, teamCycleId });
    const { own, otherTeam } = ownSessions(
      [{ athleteId: "a", sessions: [s("copia", "m1", "base"), s("propia"), s("suelta-en-copia", undefined, "base"), s("otro-equipo", "z1", "ajeno"), s("quitada-del-plan", "m-borrada", "base")] }],
      new Set(["m1"]),
      new Set(["base"]),
    );
    expect(own[0].sessions.map((x) => x.id)).toEqual(["propia", "suelta-en-copia", "quitada-del-plan"]);
    expect(otherTeam[0].sessions.map((x) => x.id)).toEqual(["otro-equipo"]);
  });

  it("sin arrastrar ofrece desde hoy los días de los ciclos abiertos", () => {
    const one = pickableDays([base], today);
    expect(one[0]).toMatchObject({ label: "Semana 2" });
    expect(one[0].days[0]).toBe(today);
    expect(one.flatMap((w) => w.days).at(-1)).toBe("2026-12-13");
    expect(pickableDays([next, base], today).at(-1)!.label).toBe("next, semana 4");
  });

  it("cuenta cuántos del equipo reciben el ciclo", () => {
    const athletes = [{ id: "a", status: "active" }, { id: "b", status: "active" }, { id: "p", status: "pending" }, { id: "i", status: "inactive" }];
    expect(cycleReach({ athletes: [{ athleteId: "a", name: "A", cycleId: "1", status: "active" }, { athleteId: "x", name: "X", cycleId: "2", status: "active" }] }, athletes)).toEqual({ receiving: 1, of: 3 });
  });
});
