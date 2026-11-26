import { cardFacts, cyclePhase, defaultRecipients, defaultTeamCycle, editReach, memberRows, ownCyclesNotice, rangesCross, removalLines, savedMessage, structureOf, teamMark, teamWeeks } from "../src/lib/teamCycle";
import { fromRows, rowsOf } from "../src/lib/teamSessionRows";
import type { PreviewMember, TeamCycleDetail, TeamSession } from "../src/services/teamCyclesApi";

const TODAY = "2026-11-25";
const copy = (athleteId: string, over: Partial<TeamSession["copies"][number]> = {}) => ({ sessionId: `s-${athleteId}`, athleteId, status: "pending" as const, adjusted: false, ...over });
const exercise = (id: string, over: object = {}) =>
  ({ id, exerciseId: `x-${id}`, blockId: null, orderIndex: 1, targetSets: 4, targetReps: 6, targetWeight: null, targetPercentRm: 80, targetRestSeconds: 90, targetRir: 2, note: "lento", exercise: { name: id }, ...over }) as TeamSession["exercises"][number];
const session = (id: string, day: string, over: Partial<TeamSession> = {}): TeamSession => ({
  id,
  name: id,
  scheduledDate: `${day}T00:00:00.000Z`,
  blocks: [],
  exercises: [],
  recipients: 2,
  completed: 0,
  adjusted: 0,
  copies: [],
  ...over,
});
const cycle = (id: string, startDate: string, endDate: string) => ({ id, name: id, objective: null, startDate, endDate, status: "active" as const });
const member = (id: string, over: Partial<PreviewMember> = {}): PreviewMember => ({ id, name: id, canReceive: true, reason: null, ownCycles: [], ...over });

describe("qué ciclo del equipo se abre", () => {
  const past = cycle("pasado", "2026-10-01", "2026-10-31");
  const now = cycle("actual", "2026-11-23", "2026-12-20");
  const next = cycle("proximo", "2027-01-04", "2027-01-31");
  it("el en curso; si no, el próximo; si no, el último", () => {
    expect(defaultTeamCycle([next, past, now], TODAY)?.id).toBe("actual");
    expect(defaultTeamCycle([next, past], TODAY)?.id).toBe("proximo");
    expect(defaultTeamCycle([past], TODAY)?.id).toBe("pasado");
    expect(defaultTeamCycle([], TODAY)).toBeNull();
    expect([past, now, next].map((c) => cyclePhase(c, TODAY))).toEqual(["past", "current", "next"]);
  });
  it("dos rangos se cruzan si comparten un día", () => {
    expect(rangesCross([now], "2026-12-20", "2027-01-10")).toBe(true);
    expect(rangesCross([now], "2026-12-21", "2027-01-10")).toBe(false);
  });
});

describe("la pizarra del equipo", () => {
  it("arma semanas desde el primer día del ciclo y ubica cada sesión en su fecha", () => {
    const weeks = teamWeeks({ startDate: "2026-11-25", endDate: "2026-12-08" }, [session("a", "2026-12-02")], TODAY);
    expect(weeks).toHaveLength(2);
    expect(weeks[0].days[0].iso).toBe("2026-11-25");
    expect(weeks[1].days[0].sessions.map((s) => s.id)).toEqual(["a"]);
  });
  it("la tarjeta dice a cuántos llega o, si ya pasó, cuántos la hicieron", () => {
    expect(cardFacts(session("a", "2026-11-27", { recipients: 10, adjusted: 1 }), TODAY)).toEqual({ text: "10 atletas", allDone: false, adjusted: "1 ajustada" });
    expect(cardFacts(session("a", "2026-11-23", { recipients: 10, completed: 10 }), TODAY)).toMatchObject({ text: "10 de 10 hechas", allDone: true });
    expect(cardFacts(session("a", TODAY, { recipients: 10, completed: 4 }), TODAY).text).toBe("4 de 10 hechas");
    expect(cardFacts(session("a", TODAY, { recipients: 1 }), TODAY).text).toBe("1 atleta");
  });
});

describe("avisos de un cambio del equipo", () => {
  it("antes de guardar dice a cuántos llega y quién no cambia", () => {
    const s = session("a", "2026-11-27", { copies: [copy("u1"), copy("u2", { adjusted: true }), copy("u3", { status: "completed" })] });
    expect(editReach(s, TODAY, () => "Camila Rojas")).toEqual({ reach: 1, kept: "La sesión ajustada de Camila Rojas no cambia." });
    expect(editReach({ ...s, scheduledDate: "2026-11-23T00:00:00.000Z" }, TODAY, () => "x").reach).toBe(0);
  });
  it("después de guardar da las cifras", () => {
    const skipped = { adjusted: 0, recorded: 0, past: 0, removed: 0 };
    expect(savedMessage({ updated: 9, skipped: { ...skipped, adjusted: 1 } })).toBe("Cambio guardado: actualizada en 9 atletas. 1 no cambió (ajustada).");
    expect(savedMessage({ updated: 1, skipped })).toBe("Cambio guardado: actualizada en 1 atleta.");
    expect(savedMessage({ updated: 7, skipped: { ...skipped, adjusted: 1, recorded: 2 } })).toBe("Cambio guardado: actualizada en 7 atletas. 3 no cambiaron (1 ajustada, 2 registradas).");
  });
  it("al sacar a alguien separa lo que se quita de lo que conserva", () => {
    expect(removalLines({ removed: 3, keptRecorded: 2, keptAdjusted: 1, keptPast: 0 }, "Camila")).toEqual([
      "Se quitan 3 sesiones futuras.",
      "Conserva 2 sesiones ya registradas.",
      "Conserva 1 sesión que ajustaste para Camila.",
    ]);
    expect(removalLines({ removed: 0, keptRecorded: 0, keptAdjusted: 0, keptPast: 1 })).toEqual(["No hay sesiones futuras que quitar.", "Se conserva 1 sesión de un día pasado."]);
  });
});

describe("quién lo recibe", () => {
  const members = [member("a"), member("b", { ownCycles: [{ id: "o", name: "Pretemporada", startDate: TODAY, endDate: TODAY }] }), member("c", { canReceive: false, reason: "pending_invitation" })];
  it("por defecto van quienes no tienen otro ciclo; con ciclo propio decide el coach", () => {
    expect(defaultRecipients(members)).toEqual(["a"]);
    expect(ownCyclesNotice(members)).toContain("1 atleta ya tiene");
    expect(ownCyclesNotice([member("a")])).toBeNull();
  });
  it("cada fila dice qué tiene de distinto y a quién se le puede asignar", () => {
    const detail = {
      ...cycle("fb", "2026-11-23", "2026-12-20"),
      teamId: "t",
      athletes: [
        { athleteId: "v", name: "v", cycleId: "cv", status: "active" },
        { athleteId: "k", name: "k", cycleId: "ck", status: "active" },
      ],
      sessions: [
        session("lun", "2026-11-23", { copies: [copy("v", { status: "completed" }), copy("k", { adjusted: true })] }),
        session("vie", "2026-11-27", { copies: [copy("v")] }),
      ],
    } as TeamCycleDetail;
    const athletes = ["v", "k", "m", "p"].map((id) => ({ id, name: id, status: id === "p" ? ("pending" as const) : ("active" as const) }));
    const own = [member("m", { ownCycles: [{ id: "o", name: "Pretemporada", startDate: TODAY, endDate: TODAY }] })];
    expect(memberRows(athletes, detail, own, TODAY).map((r) => [r.id, r.receives, r.detail, r.canAssign])).toEqual([
      ["v", true, "1 de 1 hechas hasta hoy", false],
      ["k", true, "1 sesión ajustada", false],
      ["m", false, "Sigue con «Pretemporada».", true],
      ["p", false, "Invitación pendiente", false],
    ]);
  });
});

describe("editar ejercicios de una sesión del equipo", () => {
  const s = session("a", "2026-11-27", {
    blocks: [{ id: "b1", name: "Fuerza", type: "strength", color: null, note: null, orderIndex: 1 } as TeamSession["blocks"][number]],
    exercises: [exercise("suelto", { orderIndex: 2, targetPercentRm: null, targetWeight: 42.5 }), exercise("enBloque", { blockId: "b1" })],
  });
  it("conserva ids, bloques, descanso, RIR y nota; solo cambian series, reps y carga", () => {
    const rows = rowsOf(s).map((r) => (r.key === "enBloque" ? { ...r, sets: "5", percentRm: "70" } : r));
    const { input } = fromRows(structureOf(s), rows);
    expect(input?.blocks?.[0]).toMatchObject({ id: "b1", exercises: [{ id: "enBloque", targetSets: 5, targetPercentRm: 70, targetRestSeconds: 90, targetRir: 2, note: "lento" }] });
    expect(input?.exercises?.[0]).toMatchObject({ id: "suelto", targetWeight: 42.5 });
    expect(input?.exercises?.[0].targetPercentRm).toBeUndefined();
  });
  it("marca lo que no sirve y no arma el guardado", () => {
    const rows = rowsOf(s).map((r) => (r.key === "enBloque" ? { ...r, sets: "0", percentRm: "130" } : r));
    const result = fromRows(structureOf(s), rows);
    expect(result.input).toBeNull();
    expect([...result.badSets]).toEqual(["enBloque"]);
    expect([...result.badLoad]).toEqual(["enBloque"]);
  });
});

describe("marcas en la ficha del atleta", () => {
  const team = { teamCycleId: "t" };
  it("del equipo, ajustada o registrada; nada fuera de un ciclo del equipo", () => {
    expect(teamMark(team, { teamSessionId: "m", status: "pending" })).toBe("Del equipo");
    expect(teamMark(team, { teamSessionId: "m", detachedAt: TODAY, status: "pending" })).toBe("Ajustada");
    expect(teamMark(team, { teamSessionId: null, detachedAt: TODAY, status: "pending" })).toBe("Ajustada");
    expect(teamMark(team, { teamSessionId: "m", status: "completed" })).toBe("Registrada");
    expect(teamMark(team, { status: "pending" })).toBeNull();
    expect(teamMark({ teamCycleId: null }, { teamSessionId: "m", status: "pending" })).toBeNull();
  });
});
