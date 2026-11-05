import type { TrainingCycle } from "@cycles/shared";
import type { CycleProgress } from "../src/services/trackingApi";
import {
  MAX_CYCLES, boardSessions, boardStats, boardWeeks, chooseCycles, defaultExercise, effortPoints, exerciseOptions,
  repsPoints, rirBars, visibleCharts, weightMode, weightPoints, type CycleEntry,
} from "../src/lib/summaryBoard";
import { DEFAULT_LAYOUT, hiddenCharts, hideChart, moveChart, moveChartBefore, resetLayout, resizeChart, showChart, type ChartDef } from "../src/lib/summaryBoard";
import { athleteSummaryFixture, cycleProgressFixture, summaryLayoutFixture } from "../../../packages/shared/src/fixtures/resumen";

// CYC-240: lógica de la pizarra de gráficos del Resumen del atleta.
const cycle = (id: string, start: string, end: string, over: Partial<TrainingCycle> = {}) =>
  ({ id, name: `Ciclo ${id}`, athleteId: "a", coachId: "c", startDate: start, endDate: end, status: "active", isTemplate: false, cycleType: "mesocycle", ...over }) as TrainingCycle;

type S = CycleProgress["sessions"][number];
const ex = (id: string, name: string, tw: number | null, tr: number, trir: number | null, sets: Array<[number, number | null]>, rir: number | null): S["exercises"][number] => ({
  sessionExerciseId: `${id}-${tw}`, exercise: { id, name },
  target: { sets: 3, reps: tr, weight: tw, rir: trir },
  actual: { sets: sets.map(([reps, weight], i) => ({ setNumber: i + 1, reps, weight, rir: null })), reportedRir: rir, verdict: "unknown" },
});
const ses = (id: string, week: number, slot: number, status: S["status"], srpe: number | null, exercises: S["exercises"]): S => ({
  id, name: `S${id}`, weekNumber: week, slotNumber: slot, status, exercises,
  feedback: status === "pending" ? null : ({ outcome: status === "completed" ? "completed" : "skipped", srpe, durationMinutes: null, pain: false, painNotes: null, notes: null, submittedAt: "2026-11-01" } as never),
});
const progress = (c: TrainingCycle, sessions: S[]): CycleProgress => ({ cycle: { id: c.id, name: c.name, currentWeek: 3 }, sessions });

const c1 = cycle("1", "2026-10-05", "2026-11-15");
const sessions = [
  ses("a", 1, 1, "completed", 6, [ex("sq", "Sentadilla", 80, 8, 2, [[8, 80], [8, 80]], 2), ex("pb", "Press banca", 60, 8, 3, [[8, 60]], 1)]),
  ses("b", 2, 1, "completed", 7, [ex("sq", "Sentadilla", 82.5, 8, 2, [[8, 80], [7, 80]], 1)]),
  ses("c", 3, 1, "skipped", null, [ex("sq", "Sentadilla", 85, 8, 2, [], null)]),
  ses("d", 3, 2, "pending", null, []),
];
const entries: CycleEntry[] = [{ cycle: c1, progress: progress(c1, sessions) }];

describe("periodos", () => {
  it("«Ciclo actual» elige el ciclo que incluye hoy y sin ciclos no hay nada", () => {
    expect(chooseCycles([c1, cycle("0", "2026-08-01", "2026-09-10", { status: "completed" })], "cycle", "2026-10-25").map((c) => c.id)).toEqual(["1"]);
    expect(chooseCycles([], "cycle", "2026-10-25")).toEqual([]);
  });
  it("ignora plantillas y macrociclos", () => {
    const list = [cycle("t", "2001-01-01", "2001-02-01", { isTemplate: true }), cycle("m", "2026-10-01", "2026-12-01", { cycleType: "macrocycle" })];
    expect(chooseCycles(list, "all", "2026-10-25")).toEqual([]);
  });
  it("«Todo el historial» se queda con los últimos ciclos, del más antiguo al más nuevo", () => {
    const many = Array.from({ length: MAX_CYCLES + 2 }, (_, i) => cycle(String(i), `2026-0${i + 1}-01`, `2026-0${i + 1}-20`));
    const chosen = chooseCycles(many, "all", "2026-11-01");
    expect(chosen).toHaveLength(MAX_CYCLES);
    expect(chosen[0].id).toBe("2");
  });
  it("«Últimas 4 semanas» toma los ciclos que se cruzan con ese tramo", () => {
    const old = cycle("old", "2026-06-01", "2026-07-01", { status: "completed" });
    expect(chooseCycles([old, c1], "four", "2026-10-25").map((c) => c.id)).toEqual(["1"]);
  });
  it("las sesiones salen en orden de fecha y «4 semanas» descarta las viejas", () => {
    const all = boardSessions(entries, "all", "2026-10-25");
    expect(all.map((s) => s.id)).toEqual(["a", "b", "c", "d"]);
    expect(all[1].date).toBe("2026-10-12");
    expect(boardSessions(entries, "four", "2026-11-20").map((s) => s.id)).toEqual(["c", "d"]);
  });
  it("las semanas del resumen siguen el periodo", () => {
    const weeks = ["2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26", "2026-11-02"].map((weekStart) => ({ weekStart, assigned: 3, completed: 2, skipped: 1, load: 1000 }));
    expect(boardWeeks(weeks, "all", c1)).toHaveLength(6);
    expect(boardWeeks(weeks, "four", c1)).toHaveLength(4);
    expect(boardWeeks(weeks, "cycle", c1).map((w) => w.weekStart)).toEqual(weeks.slice(1).map((w) => w.weekStart));
    expect(boardWeeks(weeks, "cycle", null)).toEqual([]);
  });
});

describe("cifras", () => {
  const stats = boardStats(boardSessions(entries, "all", "2026-10-25"));
  it("cuenta hechas, constancia y esfuerzo", () => {
    expect(stats.sessionsDone).toBe(2);
    expect(stats.sessionsTotal).toBe(4);
    expect(stats.consistency).toBeCloseTo(2 / 3);
    expect(stats.avgEffort).toBe(6.5);
  });
  it("el peso contra el plan usa la última sesión de cada ejercicio con series", () => {
    // Sentadilla: plan 82,5 y cargó 80 (−2,5); Press: plan 60 y cargó 60 (0) → −1,25
    expect(stats.weightDelta).toBeCloseTo(-1.25);
  });
  it("sin sesiones no inventa números", () => {
    const empty = boardStats([]);
    expect(empty.consistency).toBeNull();
    expect(empty.avgEffort).toBeNull();
    expect(empty.weightDelta).toBeNull();
  });
});

describe("gráfico de peso", () => {
  const all = boardSessions(entries, "all", "2026-10-25");
  it("el ejercicio por defecto es el que más se desvió", () => {
    expect(defaultExercise(exerciseOptions(all))).toBe("sq");
    expect(defaultExercise([])).toBeNull();
  });
  it("arma un punto por sesión con peso planificado y promedio cargado", () => {
    const pts = weightPoints(all, "sq");
    expect(pts.map((p) => [p.planned, p.actual])).toEqual([[80, 80], [82.5, 80], [85, null]]);
    expect(repsPoints(all, "sq").map((p) => p.actual)).toEqual([8, 7.5, null]);
  });
  it("distingue peso corporal y ejercicio sin plan de peso", () => {
    expect(weightMode([])).toBe("empty");
    expect(weightMode([{ label: "a", date: "x", planned: null, actual: null }])).toBe("bodyweight");
    expect(weightMode([{ label: "a", date: "x", planned: null, actual: 20 }])).toBe("no-plan");
    expect(weightMode([{ label: "a", date: "x", planned: 20, actual: 20 }])).toBe("plan");
  });
});

describe("esfuerzo y RIR", () => {
  const all = boardSessions(entries, "all", "2026-10-25");
  it("el esfuerzo deja hueco en las omitidas y no cuenta las pendientes", () => {
    expect(effortPoints(all).map((p) => p.value)).toEqual([6, 7, null]);
  });
  it("el desvío de RIR es plan − reportado, con su tono", () => {
    const bars = rirBars(all);
    expect(bars.find((b) => b.id === "pb")).toMatchObject({ deviation: 2, tone: "harder" });
    expect(bars.find((b) => b.id === "sq")).toMatchObject({ deviation: 0.5, tone: "even" });
  });
});

describe("disposición", () => {
  it("solo muestra lo visible y de este sistema, en el orden guardado", () => {
    const layout = [
      { id: "constancia", origen: "sistema", tamano: "mitad", visible: true },
      { id: "plan-real", origen: "sistema", tamano: "completo", visible: true },
      { id: "esfuerzo", origen: "sistema", tamano: "mitad", visible: false },
      { id: "desconocido", origen: "sistema", tamano: "mitad", visible: true },
    ] as const;
    expect(visibleCharts([...layout] as never).map((c) => c.id)).toEqual(["constancia", "plan-real"]);
  });
});


describe("modo Organizar", () => {
  const ids = (l: ChartDef[]) => l.map((c) => c.id);
  const base = DEFAULT_LAYOUT.map((c) => ({ ...c }));

  it("mover antes o después intercambia con el vecino y avisa la posición", () => {
    const r = moveChart(base, "constancia", "before")!;
    expect(ids(r.layout)).toEqual(["plan-real", "constancia", "progreso-ciclo", "esfuerzo", "costo-ejercicio"]);
    expect(r.message).toBe("Moviste «Constancia» una posición antes (ahora 2 de 5).");
    expect(moveChart(base, "plan-real", "before")).toBeNull();
    expect(moveChart(base, "costo-ejercicio", "after")).toBeNull();
    expect(moveChart(base, "no-existe", "after")).toBeNull();
  });

  it("al mover se salta a los ocultos, que conservan su lugar", () => {
    const hidden = hideChart(base, "progreso-ciclo")!.layout;
    const r = moveChart(hidden, "constancia", "before")!;
    expect(ids(r.layout)).toEqual(["constancia", "progreso-ciclo", "plan-real", "esfuerzo", "costo-ejercicio"]);
    expect(r.layout.find((c) => c.id === "progreso-ciclo")!.visible).toBe(false);
  });

  it("arrastrar deja el gráfico justo antes del destino", () => {
    const r = moveChartBefore(base, "costo-ejercicio", "progreso-ciclo")!;
    expect(ids(r.layout)).toEqual(["plan-real", "costo-ejercicio", "progreso-ciclo", "constancia", "esfuerzo"]);
    expect(moveChartBefore(base, "constancia", "constancia")).toBeNull();
  });

  it("cambia el tamaño y no hace nada si ya lo tiene", () => {
    const r = resizeChart(base, "esfuerzo", "completo")!;
    expect(r.layout.find((c) => c.id === "esfuerzo")!.tamano).toBe("completo");
    expect(resizeChart(base, "esfuerzo", "mitad")).toBeNull();
  });

  it("quitar oculta (no borra) y mostrar lo devuelve al final de los visibles", () => {
    const hidden = hideChart(base, "constancia")!;
    expect(hidden.layout).toHaveLength(5);
    expect(hiddenCharts(hidden.layout).map((c) => c.id)).toEqual(["constancia"]);
    expect(hideChart(hidden.layout, "constancia")).toBeNull();
    const shown = showChart(hidden.layout, "constancia")!;
    expect(ids(shown.layout)).toEqual(["plan-real", "progreso-ciclo", "esfuerzo", "costo-ejercicio", "constancia"]);
    expect(shown.layout.every((c) => c.visible)).toBe(true);
  });

  it("restablecer vuelve al orden original y no avisa si ya estaba así", () => {
    const moved = moveChart(hideChart(base, "esfuerzo")!.layout, "constancia", "before")!.layout;
    const r = resetLayout(moved)!;
    expect(ids(r.layout)).toEqual(ids(DEFAULT_LAYOUT));
    expect(r.layout.every((c) => c.visible)).toBe(true);
    expect(resetLayout(base)).toBeNull();
  });

  it("no modifica la lista original", () => {
    const copy = JSON.stringify(base);
    moveChart(base, "constancia", "before");
    hideChart(base, "esfuerzo");
    resizeChart(base, "esfuerzo", "completo");
    expect(JSON.stringify(base)).toBe(copy);
  });
});

// Con la forma REAL de la API (el ejemplo de @cycles/shared que la prueba e2e de la API
// comprueba contra las respuestas verdaderas), no con datos inventados.

describe("la pizarra con el contrato real de la API", () => {
  const fixtureCycle = cycle("cycle-1", "2026-10-05", "2026-11-15");
  const real: CycleEntry[] = [{ cycle: fixtureCycle, progress: cycleProgressFixture }];

  it("lee las sesiones, el esfuerzo y las cifras del progreso real", () => {
    const sessions = boardSessions(real, "all", "2026-10-25");
    expect(sessions.map((s) => s.id)).toEqual(["s-1", "s-2"]);
    expect(sessions[0].srpe).toBe(7);
    expect(sessions[1].srpe).toBeNull();
    expect(boardStats(sessions)).toMatchObject({ sessionsDone: 1, sessionsTotal: 2, avgEffort: 7, weightDelta: 0 });
    expect(effortPoints(sessions).map((p) => p.value)).toEqual([7]);
  });

  it("arma el gráfico de peso y el desvío de RIR con los campos reales", () => {
    const sessions = boardSessions(real, "all", "2026-10-25");
    const options = exerciseOptions(sessions);
    expect(options).toEqual([{ id: "ex-sq", name: "Sentadilla con barra", lastDelta: 0, sessions: 1 }]);
    expect(weightPoints(sessions, "ex-sq").map((p) => [p.planned, p.actual])).toEqual([[80, 80]]);
    expect(repsPoints(sessions, "ex-sq").map((p) => p.actual)).toEqual([7.5]);
    expect(rirBars(sessions)).toEqual([{ id: "ex-sq", name: "Sentadilla con barra", deviation: 1, tone: "harder" }]);
  });

  it("filtra las semanas del resumen real por periodo", () => {
    expect(boardWeeks(athleteSummaryFixture.weeks, "four", null)).toHaveLength(2);
    expect(boardWeeks(athleteSummaryFixture.weeks, "cycle", fixtureCycle)).toHaveLength(2);
  });

  it("muestra la disposición guardada y respeta lo oculto", () => {
    expect(visibleCharts(summaryLayoutFixture.charts).map((c) => c.id)).toEqual(["plan-real", "progreso-ciclo", "esfuerzo", "costo-ejercicio"]);
  });
});
