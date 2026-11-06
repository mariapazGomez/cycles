import type { AthleteEventOccurrence, EventSport, EventType } from '@cycles/shared';
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

export const SPORT_KIND: Record<EventSport, Kind> = {
  volleyball: { glyph: 'volley', family: 'orange', label: 'Voleibol' },
  soccer: { glyph: 'soccer', family: 'orange', label: 'Fútbol' },
  basketball: { glyph: 'basket', family: 'orange', label: 'Básquetbol' },
  running: { glyph: 'run', family: 'orange', label: 'Correr' },
  cycling: { glyph: 'bike', family: 'orange', label: 'Ciclismo' },
  swimming: { glyph: 'swim', family: 'orange', label: 'Natación' },
  weights: { glyph: 'weights', family: 'green', label: 'Pesas' },
  yoga: { glyph: 'yoga', family: 'blue', label: 'Yoga' },
  other: { glyph: 'dots', family: 'gray', label: 'Otro deporte' },
};

// Palabras (sin tildes, en minúscula) que identifican un deporte en el nombre de la actividad.
const SPORT_WORDS: Array<[EventSport, RegExp]> = [
  ['volleyball', /\b(volei|voley|voleibol|volleyball|vóley)\b/],
  ['soccer', /\b(futbol|futsal|baby futbol|soccer|pichanga)\b/],
  ['basketball', /\b(basquet|basquetbol|baloncesto|basket|basketball)\b/],
  ['running', /\b(correr|running|trote|trotar|carrera|maraton|atletismo)\b/],
  ['cycling', /\b(bici|bicicleta|ciclismo|cycling|spinning|mtb)\b/],
  ['swimming', /\b(natacion|nadar|swim|piscina)\b/],
  ['weights', /\b(pesas|gimnasio|gym|fuerza|crossfit)\b/],
  ['yoga', /\b(yoga|pilates|estiramiento)\b/],
];

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

// RESPALDO para eventos sin `sport` (anteriores al campo): se deduce el deporte del nombre
// de la actividad, sin tildes ni mayúsculas. Si no se reconoce, devuelve null.
export function sportFromTitle(title: string): EventSport | null {
  const text = normalize(title);
  const found = SPORT_WORDS.find(([, words]) => words.test(text));
  return found ? found[0] : null;
}

// Un entrenamiento usa su deporte (el campo `sport`; si falta, el respaldo por nombre; si
// tampoco, «Otro deporte»); los demás tipos, su ícono de tipo.
export function kindFor(event: Pick<AthleteEventOccurrence, 'type' | 'title'> & { sport?: EventSport | null }): Kind {
  if (event.type === 'training') {
    return SPORT_KIND[event.sport ?? sportFromTitle(event.title) ?? 'other'];
  }
  return TYPE_KIND[event.type];
}
