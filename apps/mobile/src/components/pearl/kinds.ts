import type { PearlFamily } from '../../theme/colors';
import type { GlyphName } from './glyphs';

// Qué pictograma y qué familia de color lleva cada «cosa» que se dibuja como perla
// (CYC-258). Los ids de deporte son los del campo `sport` de la API (CYC-251). La
// decisión de color sigue las reglas de `theme/colors.ts`: azul nunca, verde solo para
// la fuerza del coach, y lo del atleta en naranja, violeta, tinta, gris y rojo.
export interface PearlKind {
  glyph: GlyphName;
  family: PearlFamily;
  /** Nombre hablado: el pictograma es decorativo y el texto de la tarjeta manda. */
  label: string;
}

export const PEARL_KINDS = {
  // Del coach.
  coachStrength: { glyph: 'weights', family: 'green', label: 'Rutina del coach' },
  // Del atleta: deportes (naranja).
  volleyball: { glyph: 'volley', family: 'orange', label: 'Voleibol' },
  soccer: { glyph: 'soccer', family: 'orange', label: 'Fútbol' },
  basketball: { glyph: 'basket', family: 'orange', label: 'Básquetbol' },
  running: { glyph: 'run', family: 'orange', label: 'Correr' },
  cycling: { glyph: 'bike', family: 'orange', label: 'Ciclismo' },
  swimming: { glyph: 'swim', family: 'orange', label: 'Natación' },
  weights: { glyph: 'weights', family: 'orange', label: 'Pesas' },
  otherSport: { glyph: 'dots', family: 'orange', label: 'Otro deporte' },
  // Del atleta: descanso y yoga (violeta).
  yoga: { glyph: 'yoga', family: 'violet', label: 'Yoga' },
  rest: { glyph: 'walk', family: 'violet', label: 'Descanso activo' },
  // Del atleta: partido o competencia (tinta), viaje y otro (gris), lesión (rojo).
  match: { glyph: 'trophy', family: 'ink', label: 'Partido o competencia' },
  travel: { glyph: 'bag', family: 'gray', label: 'Viaje' },
  other: { glyph: 'dots', family: 'gray', label: 'Otro' },
  injury: { glyph: 'band', family: 'red', label: 'Lesión' },
} as const satisfies Record<string, PearlKind>;

export type PearlKindId = keyof typeof PEARL_KINDS;
