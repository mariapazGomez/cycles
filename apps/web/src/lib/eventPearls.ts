import type { AthleteEventOccurrence, EventSport, EventType } from "@cycles/shared";
import type { GlyphName } from "../assets/pearl/glyphs";

// Qué perla lleva cada actividad paralela del atleta (CYC-253). COPIA de las reglas de la app
// (apps/mobile/src/components/pearl/kinds.ts y events/eventKinds.ts, theme/colors.ts): si cambian
// allá, cámbialas aquí. Azul nunca (es de la app); verde solo para la fuerza del coach; lo del
// atleta, naranja (deportes), violeta (descanso y yoga), tinta (partido), gris (viaje y otro) y rojo (lesión).
export const PEARL_COLORS = {
  green: "#2f9e5f",
  orange: "#f08a24",
  violet: "#8a63d2",
  ink: "#1f2228",
  gray: "#8d95a2",
  red: "#d1494d",
} as const;

export type PearlFamily = keyof typeof PEARL_COLORS;

export interface PearlKind {
  glyph: GlyphName;
  family: PearlFamily;
  // Nombre hablado: el pictograma es decorativo y el texto de la fila manda.
  label: string;
}

export const PEARL_KINDS = {
  coachStrength: { glyph: "weights", family: "green", label: "Sesión del coach" },
  volleyball: { glyph: "volley", family: "orange", label: "Voleibol" },
  soccer: { glyph: "soccer", family: "orange", label: "Fútbol" },
  basketball: { glyph: "basket", family: "orange", label: "Básquetbol" },
  running: { glyph: "run", family: "orange", label: "Correr" },
  cycling: { glyph: "bike", family: "orange", label: "Ciclismo" },
  swimming: { glyph: "swim", family: "orange", label: "Natación" },
  weights: { glyph: "weights", family: "orange", label: "Pesas" },
  otherSport: { glyph: "dots", family: "orange", label: "Otro deporte" },
  yoga: { glyph: "yoga", family: "violet", label: "Yoga" },
  rest: { glyph: "walk", family: "violet", label: "Descanso activo" },
  match: { glyph: "trophy", family: "ink", label: "Partido o competencia" },
  travel: { glyph: "bag", family: "gray", label: "Viaje" },
  other: { glyph: "dots", family: "gray", label: "Otro" },
  injury: { glyph: "band", family: "red", label: "Lesión" },
} as const satisfies Record<string, PearlKind>;

export type PearlKindId = keyof typeof PEARL_KINDS;

const SPORT_PEARL: Record<EventSport, PearlKindId> = {
  volleyball: "volleyball",
  soccer: "soccer",
  basketball: "basketball",
  running: "running",
  cycling: "cycling",
  swimming: "swimming",
  weights: "weights",
  yoga: "yoga",
  other: "otherSport",
};

const TYPE_PEARL: Record<EventType, PearlKindId> = {
  training: "otherSport",
  match: "match",
  rest: "rest",
  travel: "travel",
  injury: "injury",
  other: "other",
};

// Un entrenamiento usa su deporte (`sport`; sin él, «Otro deporte»); los demás tipos, su perla de tipo.
export function kindFor(event: Pick<AthleteEventOccurrence, "type"> & { sport?: EventSport | null }): PearlKind {
  if (event.type === "training") return PEARL_KINDS[SPORT_PEARL[event.sport ?? "other"]];
  return PEARL_KINDS[TYPE_PEARL[event.type]];
}
