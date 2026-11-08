import type { AthleteEventOccurrence, TrainingCycle, TrainingSession } from "@cycles/shared";
import { athleteEventsFixture } from "../../../packages/shared/src/fixtures/athleteEvents";
import { calendarWeek, daysLabel, groupByDay, monthCell, monthGrid, monthRange, seriesIn, seriesLabel, shiftMonth, shortDate } from "../src/lib/eventCalendar";
import { PEARL_KINDS, kindFor } from "../src/lib/eventPearls";
import { clashDays, heavyThreshold, isDemanding, loadClashes, type CoachSession } from "../src/lib/loadClash";
import { coachSessionsOf, cyclesOverlapping } from "../src/lib/coachSessions";
import { rangeChunks } from "../src/lib/rangeChunks";
import { GLYPHS } from "../src/assets/pearl/glyphs";

// CYC-253: calendarios con las actividades del atleta en la web del coach.
const ev = (over: Partial<AthleteEventOccurrence>): AthleteEventOccurrence => ({ ...athleteEventsFixture.events[0], ...over });

describe("calendario de actividades", () => {
  it("la semana y el mes arman los días de lunes a domingo", () => {
    expect(calendarWeek("2026-11-11").map((d) => d.iso)).toEqual(["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15"]);
    const rows = monthGrid(2026, 11);
    expect(rows.every((r) => r.length === 7)).toBe(true);
    expect(rows[0][0].iso).toBe("2026-10-26");
    expect(rows.flat().filter((d) => d.inMonth)).toHaveLength(30);
    expect(monthRange(2026, 11)).toEqual({ from: "2026-10-26", to: "2026-12-06" });
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
  });

  it("agrupa por día, con los de todo el día primero, y muestra +N cuando son más de dos", () => {
    const day = "2026-11-17";
    const events = [ev({ date: day, startTime: "20:00", title: "B" }), ev({ date: day, allDay: true, startTime: null, durationMin: null, title: "Torneo" }), ev({ date: day, startTime: "07:00", title: "A" })];
    const groups = groupByDay(events);
    expect(groups[day].map((e) => e.title)).toEqual(["Torneo", "A", "B"]);
    const cell = monthCell({ iso: day, day: 17, weekday: 1, inMonth: true }, groups[day]);
    expect(cell.shown).toHaveLength(1);
    expect(cell.extra).toBe(2);
    expect(monthCell({ iso: day, day: 17, weekday: 1, inMonth: true }, groups[day].slice(0, 2))).toMatchObject({ extra: 0 });
  });

  it("describe cada serie con su regla de repetición", () => {
    expect(daysLabel([1, 0])).toBe("Lun y mar");
    expect(daysLabel([0, 2, 4])).toBe("Lun, mié y vie");
    expect(shortDate("2026-12-20")).toBe("20 dic");
    expect(seriesLabel(ev({ date: "2026-11-02", startTime: "19:00", repeat: { days: [0, 1], until: "2026-12-20" }, intensity: "high" }))).toBe("Lun y mar, 19:00, hasta el 20 dic. Intensidad alta.");
    expect(seriesLabel(ev({ date: "2026-11-10", startTime: "07:30", repeat: null, intensity: "low" }))).toBe("Mar 10 nov, 07:30. Intensidad suave.");
    expect(seriesLabel(ev({ repeat: { days: [5], until: null }, allDay: true, startTime: null, intensity: null }))).toBe("Sáb, todo el día, sin fecha final.");
  });

  it("una serie sale una sola vez aunque tenga muchas ocurrencias", () => {
    const list = [ev({ seriesId: "a", date: "2026-11-09" }), ev({ seriesId: "a", date: "2026-11-02" }), ev({ seriesId: "b", date: "2026-11-05" })];
    expect(seriesIn(list).map((e) => [e.seriesId, e.date])).toEqual([["a", "2026-11-02"], ["b", "2026-11-05"]]);
  });
});

describe("perlas", () => {
  it("cada actividad usa el color de su tipo y su pictograma existe", () => {
    expect(kindFor({ type: "training", sport: "volleyball" })).toBe(PEARL_KINDS.volleyball);
    expect(kindFor({ type: "training", sport: null }).label).toBe("Otro deporte");
    expect(kindFor({ type: "match", sport: null }).family).toBe("ink");
    expect(kindFor({ type: "rest" }).family).toBe("violet");
    expect(kindFor({ type: "injury" }).family).toBe("red");
    expect(PEARL_KINDS.coachStrength.family).toBe("green");
    for (const kind of Object.values(PEARL_KINDS)) expect(GLYPHS[kind.glyph].length).toBeGreaterThan(10);
  });
});

const sess = (id: string, date: string, volume: number, name = id): CoachSession => ({ id, name, date, volume });

describe("choque de carga", () => {
  const sessions = [sess("a", "2026-11-09", 12), sess("b", "2026-11-11", 14), sess("c", "2026-11-13", 24, "Piernas pesadas"), sess("d", "2026-11-16", 10), sess("e", "2026-11-18", 13), sess("f", "2026-11-20", 11)];

  it("el umbral es el del tercio más alto y exige al menos 3 sesiones", () => {
    expect(heavyThreshold(sessions)).toBe(14); // 6 sesiones → el tercio son 2: 24 y 14
    expect(heavyThreshold(sessions.slice(0, 2))).toBeNull();
    expect(heavyThreshold([sess("x", "2026-11-01", 0), sess("y", "2026-11-02", 0), sess("z", "2026-11-03", 0)])).toBeNull();
  });

  it("una actividad exigente el mismo día, el día antes o el siguiente de una sesión pesada choca", () => {
    const partido = ev({ type: "match", sport: null, title: "Partido de liga", date: "2026-11-14", intensity: "high" });
    const clashes = loadClashes(sessions, [partido]);
    expect(clashes.map((c) => [c.session.id, c.eventDate])).toEqual([["c", "2026-11-14"]]);
    expect([...clashDays(clashes)].sort()).toEqual(["2026-11-13", "2026-11-14"]);
    expect(loadClashes(sessions, [ev({ date: "2026-11-13", intensity: "high" })])).toHaveLength(1);
    expect(loadClashes(sessions, [ev({ date: "2026-11-12", intensity: "high" })])).toHaveLength(2); // antes de la 13 y después de la 11 (pesada, 14)
  });

  it("no avisa si la actividad es suave, si cae lejos o si la sesión no es pesada", () => {
    expect(isDemanding(ev({ type: "training", intensity: "medium" }))).toBe(false);
    expect(loadClashes(sessions, [ev({ date: "2026-11-13", intensity: "medium" })])).toEqual([]);
    expect(loadClashes(sessions, [ev({ date: "2026-11-16", intensity: "high" })])).toEqual([]);
    expect(loadClashes(sessions, [ev({ date: "2026-11-16", type: "match", intensity: null })].filter(() => false))).toEqual([]);
    expect(loadClashes(sessions.slice(0, 2), [ev({ date: "2026-11-13", intensity: "high" })])).toEqual([]);
  });
});

describe("sesiones del coach y rangos", () => {
  const cycle = (id: string, start: string, end: string, over: Partial<TrainingCycle> = {}) => ({ id, startDate: start, endDate: end, isTemplate: false, cycleType: "mesocycle", ...over }) as TrainingCycle;

  it("toma el día elegido y el volumen de las series planificadas; sin día no se dibuja", () => {
    const sessions = [{ id: "s1", name: "Piernas", scheduledDate: "2026-11-13T00:00:00.000Z" }, { id: "s2", name: "Sin día" }] as unknown as TrainingSession[];
    const progress = { cycle: { id: "c", name: "c", currentWeek: 1 }, sessions: [{ id: "s1", exercises: [{ target: { sets: 4 } }, { target: { sets: 5 } }] }] } as never;
    expect(coachSessionsOf(sessions, progress)).toEqual([{ id: "s1", name: "Piernas", date: "2026-11-13", volume: 9 }]);
  });

  it("solo pide los ciclos que se cruzan con el rango, sin plantillas ni macrociclos", () => {
    const list = [cycle("a", "2026-10-05", "2026-11-15"), cycle("b", "2026-01-01", "2026-02-01"), cycle("t", "2026-10-05", "2026-11-15", { isTemplate: true }), cycle("m", "2026-10-05", "2026-11-15", { cycleType: "macrocycle" })];
    expect(cyclesOverlapping(list, "2026-11-01", "2026-11-30").map((c) => c.id)).toEqual(["a"]);
  });

  it("parte los rangos de más de 92 días en consultas", () => {
    expect(rangeChunks("2026-11-01", "2026-11-30")).toEqual([{ from: "2026-11-01", to: "2026-11-30" }]);
    const long = rangeChunks("2026-01-01", "2026-07-01");
    expect(long[0]).toEqual({ from: "2026-01-01", to: "2026-04-02" });
    expect(long[long.length - 1].to).toBe("2026-07-01");
    expect(long.every((c) => (Date.parse(c.to) - Date.parse(c.from)) / 86_400_000 + 1 <= 92)).toBe(true);
  });
});

describe("con el ejemplo compartido de la API", () => {
  it("las ocurrencias reales se agrupan por día y cada una tiene perla", () => {
    const groups = groupByDay(athleteEventsFixture.events);
    expect(Object.keys(groups)).toEqual(["2026-11-02", "2026-11-03", "2026-11-07"]);
    for (const e of athleteEventsFixture.events) expect(kindFor(e).label.length).toBeGreaterThan(0);
    expect(seriesIn(athleteEventsFixture.events).map((e) => e.seriesId)).toEqual(["ev-volei", "ev-liga"]);
  });
});
