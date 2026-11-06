import type { AthleteEventOccurrence, EventType } from '@cycles/shared';
import type { GlyphName } from './glyphs';

// Qué pictograma y qué color lleva cada actividad (diseño v3, CYC-237): un ícono por
// deporte y por tipo, en la perla de color de su familia. Estilo pendiente de que la
// usuaria apruebe el diseño; esta capa solo decide QUÉ se dibuja.
export type Family = 'orange' | 'green' | 'blue' | 'ink' | 'gray' | 'red';

export const FAMILY_COLOR: Record<Family, string> = {
  orange: '#f08a24',
  green: '#2f9e5f',
  blue: '#3080fc',
  ink: '#1f2228',
  gray: '#8d95a2',
  red: '#d1494d',
};

export interface Kind {
  glyph: GlyphName;
  family: Family;
  /** Nombre hablado del ícono (el pictograma es decorativo; el texto de la tarjeta manda). */
  label: string;
}

export const TYPE_KIND: Record<EventType, Kind> = {
  training: { glyph: 'dots', family: 'orange', label: 'Entrenamiento paralelo' },
  match: { glyph: 'trophy', family: 'ink', label: 'Partido o competencia' },
  rest: { glyph: 'walk', family: 'blue', label: 'Descanso activo' },
  travel: { glyph: 'bag', family: 'gray', label: 'Viaje' },
  injury: { glyph: 'band', family: 'red', label: 'Lesión' },
  other: { glyph: 'dots', family: 'gray', label: 'Otro' },
};

export const SPORT_KIND: Record<string, Kind> = {
  volley: { glyph: 'volley', family: 'orange', label: 'Voleibol' },
  soccer: { glyph: 'soccer', family: 'orange', label: 'Fútbol' },
  basket: { glyph: 'basket', family: 'orange', label: 'Básquetbol' },
  run: { glyph: 'run', family: 'orange', label: 'Correr' },
  bike: { glyph: 'bike', family: 'orange', label: 'Ciclismo' },
  swim: { glyph: 'swim', family: 'orange', label: 'Natación' },
  weights: { glyph: 'weights', family: 'green', label: 'Pesas' },
  yoga: { glyph: 'yoga', family: 'blue', label: 'Yoga' },
  other: { glyph: 'dots', family: 'gray', label: 'Otro deporte' },
};

// Palabras (sin tildes, en minúscula) que identifican un deporte en el nombre de la actividad.
const SPORT_WORDS: Array<[string, RegExp]> = [
  ['volley', /\b(volei|voley|voleibol|volleyball|vóley)\b/],
  ['soccer', /\b(futbol|futsal|baby futbol|soccer|pichanga)\b/],
  ['basket', /\b(basquet|basquetbol|baloncesto|basket|basketball)\b/],
  ['run', /\b(correr|running|trote|trotar|carrera|maraton|atletismo)\b/],
  ['bike', /\b(bici|bicicleta|ciclismo|cycling|spinning|mtb)\b/],
  ['swim', /\b(natacion|nadar|swim|piscina)\b/],
  ['weights', /\b(pesas|gimnasio|gym|fuerza|crossfit)\b/],
  ['yoga', /\b(yoga|pilates|estiramiento)\b/],
];

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

// El modelo no tiene un campo «deporte»: el nombre de la actividad es el deporte (los chips
// del alta escriben «Voleibol», «Fútbol»…). Si no se reconoce, queda «Otro deporte».
export function sportOf(title: string): Kind | null {
  const text = normalize(title);
  const found = SPORT_WORDS.find(([, words]) => words.test(text));
  return found ? SPORT_KIND[found[0]] : null;
}

export function kindFor(event: Pick<AthleteEventOccurrence, 'type' | 'title'>): Kind {
  if (event.type === 'training') {
    return sportOf(event.title) ?? SPORT_KIND.other;
  }
  return TYPE_KIND[event.type];
}
