import { QUESTIONS as web, MAX_OTHER_LENGTH as webMax } from "../../../web/src/lib/coachQuestions";
import { MAX_OTHER_LENGTH, QUESTIONS } from "./questions";

// La web muestra las preguntas con sus propios textos cortos; las claves, los textos de las
// opciones y las reglas tienen que ser los de la API (CYC-295).
describe("preguntas del perfil: la web y la API", () => {
  it("tienen las mismas preguntas, opciones, textos, emojis y reglas", () => {
    expect(web.map((q) => q.id)).toEqual(QUESTIONS.map((q) => q.id));
    for (const question of QUESTIONS) {
      const mine = web.find((q) => q.id === question.id)!;
      const brief = (list: { key: string; label: string; emoji?: string }[]) => list.map((o) => [o.key, o.label, o.emoji ?? null]);
      expect(brief(mine.options)).toEqual(brief(question.options.filter((o) => !o.retired)));
      expect([mine.max, mine.exclusive]).toEqual([question.max, question.exclusive]);
    }
    expect(webMax).toBe(MAX_OTHER_LENGTH);
  });
});
