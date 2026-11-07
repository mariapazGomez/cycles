import { BadRequestException } from "@nestjs/common";
import { parseCreate, parseDeleteQuery, parseUpdate } from "./event-input";

// Validación de lo que manda el atleta (CYC-251).
const ok = { type: "training", sport: "volleyball", title: "  Voleibol ", date: "2026-11-02", startTime: "19:00", durationMin: 90, intensity: "medium", repeat: { days: [1, 0], until: "2026-12-14" } };

describe("crear", () => {
  it("acepta una actividad completa y la normaliza", () => {
    const e = parseCreate(ok);
    expect(e).toMatchObject({ title: "Voleibol", allDay: false, notes: null, repeat: { days: [0, 1], until: "2026-12-14" } });
  });
  it("lo mínimo son tipo, título y fecha", () => {
    expect(parseCreate({ type: "match", title: "Liga", date: "2026-11-07" })).toMatchObject({ sport: null, startTime: null, repeat: null, allDay: false });
  });
  it.each([
    ["campo que no existe", { ...ok, athleteId: "otro" }],
    ["tipo inventado", { ...ok, type: "yoga" }],
    ["deporte inventado", { ...ok, sport: "boxeo" }],
    ["título vacío", { ...ok, title: "   " }],
    ["título de 61 caracteres", { ...ok, title: "x".repeat(61) }],
    ["notas de 501 caracteres", { ...ok, notes: "x".repeat(501) }],
    ["fecha que no existe", { ...ok, date: "2026-02-30" }],
    ["hora mal escrita", { ...ok, startTime: "7 pm" }],
    ["duración 0", { ...ok, durationMin: 0 }],
    ["duración 601", { ...ok, durationMin: 601 }],
    ["todo el día con hora", { ...ok, allDay: true }],
    ["duración sin hora", { type: "training", title: "x", date: "2026-11-02", durationMin: 60 }],
    ["repetición sin días", { ...ok, repeat: { days: [], until: null } }],
    ["días repetidos", { ...ok, repeat: { days: [1, 1], until: null } }],
    ["día 7", { ...ok, repeat: { days: [7], until: null } }],
    ["hasta antes del inicio", { ...ok, repeat: { days: [0], until: "2026-10-01" } }],
    ["inicio fuera de los días de la repetición", { ...ok, date: "2026-11-04" }],
    ["falta la fecha", { type: "match", title: "Liga" }],
    ["no es un objeto", "hola"],
  ])("rechaza con 400: %s", (_caso, body) => {
    expect(() => parseCreate(body)).toThrow(BadRequestException);
  });
});

describe("editar", () => {
  it("«toda la serie» puede cambiar el inicio y la repetición", () => {
    expect(parseUpdate({ scope: "series", date: "2026-11-09", repeat: { days: [0], until: null } })).toMatchObject({ scope: "series", occurrenceDate: null });
  });
  it("«solo esta ocurrencia» lleva su fecha y cambia solo campos del día", () => {
    expect(parseUpdate({ scope: "occurrence", occurrenceDate: "2026-11-03", startTime: "20:00" })).toMatchObject({ occurrenceDate: "2026-11-03", patch: { startTime: "20:00" } });
  });
  it.each([
    ["occurrence sin fecha de la ocurrencia", { scope: "occurrence", startTime: "20:00" }],
    ["occurrence moviendo el día", { scope: "occurrence", occurrenceDate: "2026-11-03", date: "2026-11-04" }],
    ["occurrence cambiando la repetición", { scope: "occurrence", occurrenceDate: "2026-11-03", repeat: null }],
    ["series con occurrenceDate", { scope: "series", occurrenceDate: "2026-11-03", title: "x" }],
    ["series sin cambios", { scope: "series" }],
    ["sin scope", { title: "x" }],
    ["scope inventado", { scope: "todas", title: "x" }],
  ])("rechaza con 400: %s", (_caso, body) => {
    expect(() => parseUpdate(body)).toThrow(BadRequestException);
  });
});

describe("borrar", () => {
  it("occurrence pide la fecha y series no", () => {
    expect(parseDeleteQuery({ scope: "occurrence", date: "2026-11-03" })).toEqual({ scope: "occurrence", date: "2026-11-03" });
    expect(parseDeleteQuery({ scope: "series" })).toEqual({ scope: "series", date: null });
    expect(() => parseDeleteQuery({ scope: "occurrence" })).toThrow(BadRequestException);
    expect(() => parseDeleteQuery({})).toThrow(BadRequestException);
  });
});
