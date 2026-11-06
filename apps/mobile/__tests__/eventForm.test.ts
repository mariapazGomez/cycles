import {
  buildCreateInput,
  buildUpdateInput,
  emptyForm,
  hasErrors,
  repeatSummary,
  validateForm,
  type EventFormState,
} from '../src/utils/eventForm';

const base = (over: Partial<EventFormState> = {}): EventFormState => ({ ...emptyForm('2026-11-02'), title: 'Voleibol', ...over });

test('un formulario nuevo parte válido salvo el nombre; el partido arranca con intensidad alta', () => {
  expect(validateForm(emptyForm('2026-11-02')).title).toBe('Escribe un nombre.');
  expect(emptyForm('2026-11-02', 'match').intensity).toBe('high');
  expect(emptyForm('2026-11-02').intensity).toBe('medium');
  expect(hasErrors(validateForm(base()))).toBe(false);
});

test('valida nombre, fecha, hora y duración', () => {
  expect(validateForm(base({ title: '   ' })).title).toBeDefined();
  expect(validateForm(base({ title: 'x'.repeat(61) })).title).toContain('60');
  expect(validateForm(base({ date: '2026-13-40' })).date).toBeDefined();
  expect(validateForm(base({ date: '02/11/2026' })).date).toBeDefined();
  expect(validateForm(base({ startTime: '25:00' })).startTime).toBeDefined();
  expect(validateForm(base({ startTime: '19:00' })).startTime).toBeUndefined();
  expect(validateForm(base({ durationMin: '0' })).durationMin).toBeDefined();
  expect(validateForm(base({ durationMin: '601' })).durationMin).toContain('600');
  expect(validateForm(base({ durationMin: '600' })).durationMin).toBeUndefined();
  expect(validateForm(base({ durationMin: '90' })).durationMin).toBeUndefined();
});

test('todo el día ignora hora y duración', () => {
  const form = base({ allDay: true, startTime: 'basura', durationMin: '-5' });
  expect(hasErrors(validateForm(form))).toBe(false);
  expect(buildCreateInput(form)).toMatchObject({ allDay: true, startTime: null, durationMin: null });
});

test('la repetición exige días y una fecha final no anterior al inicio', () => {
  expect(validateForm(base({ repeats: true })).repeatDays).toBeDefined();
  expect(validateForm(base({ repeats: true, repeatDays: [0], until: '2026-10-01' })).until).toBeDefined();
  expect(validateForm(base({ repeats: true, repeatDays: [0], until: 'mañana' })).until).toBeDefined();
  expect(hasErrors(validateForm(base({ repeats: true, repeatDays: [0, 1], until: '' })))).toBe(false);
  // Si no se repite, los días y la fecha final no cuentan.
  expect(hasErrors(validateForm(base({ repeats: false, repeatDays: [], until: 'x' })))).toBe(false);
});

test('buildCreateInput arma la petición con la repetición ordenada y sin espacios sobrantes', () => {
  const input = buildCreateInput(
    base({ title: '  Voleibol ', startTime: '19:00', durationMin: '90', repeats: true, repeatDays: [1, 0], until: '2026-12-14', notes: '  Cancha 2 ' }),
  );
  expect(input).toEqual({
    type: 'training', title: 'Voleibol', date: '2026-11-02', allDay: false, startTime: '19:00', durationMin: 90,
    intensity: 'medium', notes: 'Cancha 2', repeat: { days: [0, 1], until: '2026-12-14' },
  });
  expect(buildCreateInput(base({ repeats: true, repeatDays: [5], until: '' })).repeat).toEqual({ days: [5], until: null });
  expect(buildCreateInput(base()).repeat).toBeNull();
  expect(buildCreateInput(base({ notes: '' })).notes).toBeNull();
});

test('editar «solo este día» manda la fecha de la ocurrencia y no la repetición; «toda la serie» sí', () => {
  const form = base({ repeats: true, repeatDays: [0], until: '2026-12-14' });
  const one = buildUpdateInput(form, 'occurrence', '2026-11-09');
  expect(one).toMatchObject({ scope: 'occurrence', occurrenceDate: '2026-11-09' });
  expect(one).not.toHaveProperty('repeat');
  const all = buildUpdateInput(form, 'series', '2026-11-09');
  expect(all).toMatchObject({ scope: 'series', repeat: { days: [0], until: '2026-12-14' } });
  expect(all).not.toHaveProperty('occurrenceDate');
});

test('repeatSummary cuenta cada día entre el inicio y la fecha final', () => {
  // Del lunes 2-nov al domingo 13-dic hay 6 lunes y 6 martes.
  expect(repeatSummary(base({ repeats: true, repeatDays: [0, 1], until: '2026-12-13' }))).toBe('Se agregan 6 lunes y 6 martes.');
  expect(repeatSummary(base({ repeats: true, repeatDays: [5], until: '2026-11-07' }))).toBe('Se agregan 1 sábado.');
  expect(repeatSummary(base({ repeats: true, repeatDays: [0, 2, 4], until: '2026-11-08' }))).toBe('Se agregan 1 lunes, 1 miércoles y 1 viernes.');
  expect(repeatSummary(base({ repeats: true, repeatDays: [0], until: '' }))).toBe('Se repite todas las semanas, sin fecha final.');
  expect(repeatSummary(base({ repeats: false }))).toBe('');
  expect(repeatSummary(base({ repeats: true, repeatDays: [] }))).toBe('');
});

test('las notas se recortan a 500 letras (regla de la API)', () => {
  expect(buildCreateInput(base({ notes: 'n'.repeat(900) })).notes).toHaveLength(500);
});
