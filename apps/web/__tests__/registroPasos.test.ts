import { FINAL_STEP, isBlocked, profileTags, progressOf, QUESTIONS, resumeAt, searchSports, surveyProgressOf, toggle } from "../src/lib/coachQuestions";
import { finishSurvey, needsCoachQuestions, noveltiesWait, showsSurvey } from "../src/lib/coachGate";

const q = (id: string) => QUESTIONS.find((x) => x.id === id)!;

describe("registro por pasos (CYC-295)", () => {
  it("el avance cuenta la cuenta y las siete preguntas, como en el diseño", () => {
    expect(Array.from({ length: FINAL_STEP + 1 }, (_, i) => progressOf(i))).toEqual([0, 13, 25, 38, 50, 63, 75, 88, 100]);
  });

  it("retoma en la primera pregunta sin responder", () => {
    expect([resumeAt(0), resumeAt(3), resumeAt(6), resumeAt(7), resumeAt(99)]).toEqual([1, 4, 7, 8, 8]);
  });

  it("marca y desmarca con las reglas de cada pregunta", () => {
    expect(toggle(q("places"), ["gimnasio"], "cancha")).toEqual(["gimnasio", "cancha"]);
    expect(toggle(q("places"), ["gimnasio", "cancha"], "gimnasio")).toEqual(["cancha"]);
    // Una sola respuesta: se cambia.
    expect(toggle(q("athleteRange"), ["1-5"], "6-15")).toEqual(["6-15"]);
    // La opción que excluye al resto, en los dos sentidos.
    expect(toggle(q("sports"), ["futbol", "tenis"], "sin-deporte-especifico")).toEqual(["sin-deporte-especifico"]);
    expect(toggle(q("sports"), ["sin-deporte-especifico"], "futbol")).toEqual(["futbol"]);
    // Hasta dos: la tercera no entra y se ve desactivada.
    const two = ["armar-planes", "ajustar"];
    expect(toggle(q("pains"), two, "seguimiento")).toEqual(two);
    expect(isBlocked(q("pains"), two, "seguimiento")).toBe(true);
    expect(isBlocked(q("pains"), two, "ajustar")).toBe(false);
    expect(isBlocked(q("athleteRange"), ["1-5"], "6-15")).toBe(false);
  });

  it("el buscador ignora tildes y acepta variantes; las dos opciones aparte no se filtran", () => {
    const keys = (text: string) => searchSports(q("sports"), text).map((o) => o.key);
    expect(keys("voley")).toEqual(["voleibol"]);
    expect(keys("VÓLEI")).toEqual(["voleibol"]);
    expect(keys("natacion")).toEqual(["natacion"]);
    expect(keys("balonmano")).toEqual(["handball"]);
    expect(keys("basket")).toEqual(["basquetbol"]);
    expect(keys("zzz")).toEqual([]);
    expect(keys("")).toHaveLength(22);
    expect(keys("")).not.toContain("otro");
    expect(keys("")).not.toContain("sin-deporte-especifico");
  });

  it("el perfil muestra hasta tres etiquetas por fila; con más, dos y «+n»", () => {
    expect(profileTags(q("sports"), ["futbol", "tenis", "judo"])).toMatchObject({ more: 0 });
    const many = profileTags(q("sports"), ["futbol", "tenis", "judo", "boxeo", "rugby"]);
    expect([many.shown.map((o) => o.label), many.more]).toEqual([["Fútbol", "Tenis"], 3]);
    expect(profileTags(q("tools"), ["planillas"]).shown[0].short).toBe("Planillas");
  });

  it("solo lleva a las preguntas a quien dejó a medias su registro, y deja libre «Mi cuenta»", () => {
    const pending = { coachSurvey: "register" as const };
    expect(needsCoachQuestions(pending, "/")).toBe(true);
    expect(needsCoachQuestions(pending, "/equipos")).toBe(true);
    expect(needsCoachQuestions(pending, "/account")).toBe(false);
    expect(needsCoachQuestions(pending, "/register/preguntas")).toBe(false);
    expect(needsCoachQuestions({ coachSurvey: "survey" }, "/")).toBe(false);
    expect(needsCoachQuestions({ coachSurvey: null }, "/")).toBe(false);
    expect(needsCoachQuestions(null, "/")).toBe(false);
  });

  it("en la encuesta el avance cuenta solo las siete preguntas, como en su diseño", () => {
    expect(Array.from({ length: FINAL_STEP + 1 }, (_, i) => surveyProgressOf(i))).toEqual([0, 0, 14, 29, 43, 57, 71, 86, 100]);
  });

  it("la encuesta va encima de la app salvo en «Mi cuenta» y después de aceptar la política", () => {
    const pending = { coachSurvey: "survey" as const, needsPolicyAcceptance: false };
    expect(showsSurvey(pending, "/")).toBe(true);
    expect(showsSurvey(pending, "/equipos")).toBe(true);
    expect(showsSurvey(pending, "/account")).toBe(false);
    expect(showsSurvey({ ...pending, needsPolicyAcceptance: true }, "/")).toBe(false);
    expect(showsSurvey({ coachSurvey: "register" }, "/")).toBe(false);
    expect(showsSurvey(null, "/")).toBe(false);
  });

  it("las novedades esperan mientras hay preguntas y, al terminar la encuesta, hasta la próxima carga", () => {
    expect(noveltiesWait({ coachSurvey: "survey" })).toBe(true);
    expect(noveltiesWait({ coachSurvey: null })).toBe(false);
    finishSurvey();
    expect(noveltiesWait({ coachSurvey: null })).toBe(true);
  });
});
