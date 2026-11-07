import { PEARL_KINDS } from '../src/components/pearl/kinds';
import { SPORT_PEARL, TYPE_PEARL, kindFor, sportFromTitle } from '../src/components/events/eventKinds';

test('cada deporte y cada tipo apuntan a una perla que existe', () => {
  [...Object.values(SPORT_PEARL), ...Object.values(TYPE_PEARL)].forEach(id => expect(PEARL_KINDS[id]).toBeDefined());
});

test('respaldo: reconoce el deporte por el nombre, sin tildes ni mayúsculas', () => {
  expect(sportFromTitle('Voleibol')).toBe('volleyball');
  expect(sportFromTitle('VÓLEI de playa')).toBe('volleyball');
  expect(sportFromTitle('Fútbol')).toBe('soccer');
  expect(sportFromTitle('Básquetbol')).toBe('basketball');
  expect(sportFromTitle('Natación')).toBe('swimming');
  expect(sportFromTitle('Gimnasio')).toBe('weights');
  expect(sportFromTitle('Cumpleaños')).toBeNull();
});

test('el campo sport manda sobre el nombre; sin sport vale el respaldo por nombre; sin nada, «Otro deporte»', () => {
  expect(kindFor({ type: 'training', sport: 'swimming', title: 'Voleibol' }).glyph).toBe('swim');
  expect(kindFor({ type: 'training', sport: null, title: 'Voleibol' }).glyph).toBe('volley');
  expect(kindFor({ type: 'training', title: 'Fútbol' }).glyph).toBe('soccer');
  expect(kindFor({ type: 'training', sport: null, title: 'Boxeo' })).toBe(PEARL_KINDS.otherSport);
  expect(kindFor({ type: 'training', sport: 'other', title: 'Vóley playa' })).toBe(PEARL_KINDS.otherSport);
});

test('colores por rol: pesas del atleta en naranja (no verde), descanso en violeta, partido en tinta', () => {
  expect(kindFor({ type: 'training', sport: 'weights', title: 'Pesas' }).family).toBe('orange');
  expect(kindFor({ type: 'rest', title: 'Caminata' }).family).toBe('violet');
  expect(kindFor({ type: 'training', sport: 'yoga', title: 'Yoga' }).family).toBe('violet');
  expect(kindFor({ type: 'match', sport: 'volleyball', title: 'Partido de liga' })).toBe(PEARL_KINDS.match);
  expect(kindFor({ type: 'injury', title: 'Rodilla' }).family).toBe('red');
  expect(kindFor({ type: 'travel', title: 'Viaje' }).family).toBe('gray');
});
