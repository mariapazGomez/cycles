import type { AthleteEventOccurrence, EventSport, EventType } from '@cycles/shared';
import { PEARL_KINDS, type PearlKind, type PearlKindId } from '../pearl/kinds';

// Qué perla lleva cada actividad paralela del atleta (CYC-252). Los colores y las reglas
// están en theme/colors.ts y components/pearl/kinds.ts (CYC-258): deporte en naranja,
// descanso y yoga en violeta, partido en tinta, viaje y otro en gris, lesión en rojo.
export const SPORT_PEARL: Record<EventSport, PearlKindId> = {
  volleyball: 'volleyball',
  soccer: 'soccer',
  basketball: 'basketball',
  running: 'running',
  cycling: 'cycling',
  swimming: 'swimming',
  weights: 'weights',
  yoga: 'yoga',
  other: 'otherSport',
};

export const TYPE_PEARL: Record<EventType, PearlKindId> = {
  training: 'otherSport',
  match: 'match',
  rest: 'rest',
  travel: 'travel',
  injury: 'injury',
  other: 'other',
};

// Palabras (sin tildes, en minúscula) que identifican un deporte en el nombre de la actividad.
const SPORT_WORDS: Array<[EventSport, RegExp]> = [
  ['volleyball', /\b(volei|voley|voleibol|volleyball)\b/],
  ['soccer', /\b(futbol|futsal|soccer|pichanga)\b/],
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
// tampoco, «Otro deporte»); los demás tipos, su perla de tipo.
export function kindFor(event: Pick<AthleteEventOccurrence, 'type' | 'title'> & { sport?: EventSport | null }): PearlKind {
  if (event.type === 'training') {
    return PEARL_KINDS[SPORT_PEARL[event.sport ?? sportFromTitle(event.title) ?? 'other']];
  }
  return PEARL_KINDS[TYPE_PEARL[event.type]];
}
