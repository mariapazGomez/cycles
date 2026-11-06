import type {
  CreateAthleteEventInput,
  EventIntensity,
  EventScope,
  EventType,
  UpdateAthleteEventInput,
} from '@cycles/shared';
import { addDays, weekdayOf } from './eventCalendar';

// Estado, validación y armado de la petición del formulario de alta/edición (CYC-252).
// Sin estilos: lo usa un componente provisional hasta que llegue el diseño final.
export interface EventFormState {
  type: EventType;
  title: string;
  date: string;
  allDay: boolean;
  startTime: string;
  durationMin: string;
  intensity: EventIntensity | null;
  notes: string;
  repeats: boolean;
  repeatDays: number[];
  /** Fecha final de la repetición; vacío = sin fecha final. */
  until: string;
}

export type FormErrors = Partial<Record<'title' | 'date' | 'startTime' | 'durationMin' | 'repeatDays' | 'until', string>>;

export const TITLE_MAX = 60;
export const NOTES_MAX = 300;

export function emptyForm(date: string, type: EventType = 'training'): EventFormState {
  return {
    type,
    title: '',
    date,
    allDay: false,
    startTime: '',
    durationMin: '',
    // El partido arranca en intensidad alta (diseño).
    intensity: type === 'match' ? 'high' : 'medium',
    notes: '',
    repeats: false,
    repeatDays: [],
    until: '',
  };
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function isRealDate(iso: string): boolean {
  if (!DATE.test(iso)) {
    return false;
  }
  const ms = Date.parse(`${iso}T00:00:00Z`);
  // «2026-02-30» no existe; «2026-13-40» ni siquiera es una fecha.
  return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === iso;
}

export function validateForm(form: EventFormState): FormErrors {
  const errors: FormErrors = {};
  const title = form.title.trim();
  if (!title) {
    errors.title = 'Escribe un nombre.';
  } else if (title.length > TITLE_MAX) {
    errors.title = `Máximo ${TITLE_MAX} letras.`;
  }
  if (!isRealDate(form.date)) {
    errors.date = 'Elige una fecha válida.';
  }
  if (!form.allDay && form.startTime && !TIME.test(form.startTime)) {
    errors.startTime = 'Escribe la hora como 19:00.';
  }
  if (!form.allDay && form.durationMin) {
    const minutes = Number(form.durationMin);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
      errors.durationMin = 'La duración va de 1 a 1440 minutos.';
    }
  }
  if (form.repeats) {
    if (form.repeatDays.length === 0) {
      errors.repeatDays = 'Elige al menos un día de la semana.';
    }
    if (form.until) {
      if (!isRealDate(form.until)) {
        errors.until = 'Elige una fecha final válida.';
      } else if (isRealDate(form.date) && form.until < form.date) {
        errors.until = 'La fecha final no puede ser antes del primer día.';
      }
    }
  }
  return errors;
}

export const hasErrors = (errors: FormErrors) => Object.keys(errors).length > 0;

function body(form: EventFormState): CreateAthleteEventInput {
  const duration = !form.allDay && form.durationMin ? Number(form.durationMin) : null;
  return {
    type: form.type,
    title: form.title.trim(),
    date: form.date,
    allDay: form.allDay,
    startTime: !form.allDay && form.startTime ? form.startTime : null,
    durationMin: duration,
    intensity: form.intensity,
    notes: form.notes.trim() ? form.notes.trim().slice(0, NOTES_MAX) : null,
    repeat: form.repeats ? { days: [...form.repeatDays].sort((a, b) => a - b), until: form.until || null } : null,
  };
}

export const buildCreateInput = (form: EventFormState): CreateAthleteEventInput => body(form);

// Editar «solo este día» manda la fecha de la ocurrencia y no toca la repetición;
// «toda la serie» manda todo, repetición incluida.
export function buildUpdateInput(form: EventFormState, scope: EventScope, occurrenceDate: string): UpdateAthleteEventInput {
  const { repeat, ...rest } = body(form);
  return scope === 'occurrence'
    ? { ...rest, scope, occurrenceDate }
    : { ...rest, repeat, scope };
}

const PLURAL = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados', 'domingos'];
const SINGULAR = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

// «Se agregan 6 lunes y 6 martes.» a partir de la fecha de inicio y la final.
export function repeatSummary(form: EventFormState): string {
  if (!form.repeats || form.repeatDays.length === 0 || !isRealDate(form.date)) {
    return '';
  }
  if (!form.until || !isRealDate(form.until) || form.until < form.date) {
    return 'Se repite todas las semanas, sin fecha final.';
  }
  const counts = new Map<number, number>();
  for (let day = form.date; day <= form.until; day = addDays(day, 1)) {
    const weekday = weekdayOf(day);
    if (form.repeatDays.includes(weekday)) {
      counts.set(weekday, (counts.get(weekday) ?? 0) + 1);
    }
  }
  const parts = [...form.repeatDays]
    .sort((a, b) => a - b)
    .map(d => `${counts.get(d) ?? 0} ${(counts.get(d) ?? 0) === 1 ? SINGULAR[d] : PLURAL[d]}`);
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}` : parts[0];
  return `Se agregan ${list}.`;
}
