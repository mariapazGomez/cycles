import { BadRequestException } from "@nestjs/common";
import { MAX_OTHER_LENGTH, NO_SPORT, OTHER, Question, QUESTION_IDS, QUESTIONS, questionById, QuestionId } from "./questions";

// Lo guardado de un perfil, como está en la base.
export interface StoredProfile {
  places: string[];
  modes: string[];
  sports: string[];
  noSpecificSport: boolean;
  athleteRange: string | null;
  tools: string[];
  pains: string[];
  trainingTypes: string[];
  otherTexts: unknown;
}

// Las claves elegidas en una pregunta.
export function chosen(profile: StoredProfile, id: QuestionId): string[] {
  if (id === "sports") return profile.noSpecificSport ? [NO_SPORT] : profile.sports;
  if (id === "athleteRange") return profile.athleteRange ? [profile.athleteRange] : [];
  return profile[id];
}

export const otherTextsOf = (profile: StoredProfile): Record<string, string> => (profile.otherTexts ?? {}) as Record<string, string>;

// Cuántas preguntas seguidas desde la primera están respondidas: ahí se retoma.
export function resumeStep(profile: StoredProfile): number {
  const missing = QUESTION_IDS.findIndex((id) => chosen(profile, id).length === 0);
  return missing === -1 ? QUESTION_IDS.length : missing;
}

export function answeredCount(profile: StoredProfile): number {
  return QUESTION_IDS.filter((id) => chosen(profile, id).length > 0).length;
}

// Lo escrito en «Otro»: texto corto de una línea, sin caracteres de control.
export function cleanOther(raw: string | undefined): string {
  // eslint-disable-next-line no-control-regex
  return (raw ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_OTHER_LENGTH);
}

// Valida una respuesta y devuelve las claves en el orden de las opciones.
export function parseAnswer(question: Question, values: string[]): string[] {
  const unique = new Set(values);
  const allowed = question.options.filter((o) => !o.retired).map((o) => o.key);
  if (unique.size === 0) throw new BadRequestException("Elige al menos una opción.");
  if ([...unique].some((v) => !allowed.includes(v))) throw new BadRequestException("Esa opción no existe.");
  if (question.max !== undefined && unique.size > question.max) {
    throw new BadRequestException(question.max === 1 ? "Elige una sola opción." : `Elige hasta ${question.max} opciones.`);
  }
  if (question.exclusive && unique.has(question.exclusive) && unique.size > 1) {
    const label = question.options.find((o) => o.key === question.exclusive)!.label;
    throw new BadRequestException(`«${label}» no se combina con otras opciones.`);
  }
  return allowed.filter((key) => unique.has(key));
}

// Las columnas que cambian al responder una pregunta.
export function columnsFor(id: QuestionId, keys: string[]) {
  if (id === "sports") {
    const none = keys.includes(NO_SPORT);
    return { sports: none ? [] : keys, noSpecificSport: none };
  }
  if (id === "athleteRange") return { athleteRange: keys[0] };
  return { [id]: keys };
}

export function nextOtherTexts(current: Record<string, string>, id: QuestionId, keys: string[], other: string | undefined): Record<string, string> {
  const next = { ...current };
  const text = keys.includes(OTHER) ? cleanOther(other) : "";
  if (text) next[id] = text;
  else delete next[id];
  return next;
}

// Para admin: cada pregunta con lo elegido en palabras, o null si falta.
export function readableAnswers(profile: StoredProfile): { label: string; answer: string | null }[] {
  const others = otherTextsOf(profile);
  return QUESTIONS.map((question) => {
    const keys = chosen(profile, question.id);
    const words = keys.map((key) => {
      const option = questionById(question.id).options.find((o) => o.key === key);
      const base = option ? `${option.emoji ? `${option.emoji} ` : ""}${option.label}` : key;
      return key === OTHER && others[question.id] ? `${base}: ${others[question.id]}` : base;
    });
    return { label: question.adminLabel, answer: words.length > 0 ? words.join(", ") : null };
  });
}
