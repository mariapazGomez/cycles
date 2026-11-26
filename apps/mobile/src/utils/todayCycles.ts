// «Hoy» con dos ciclos a la vez (CYC-314, docs/diseno/ciclo-del-equipo, «Dos ciclos a la vez»).
// Reglas puras: qué tarjetas salen, en qué orden y cuál va abierta. Las dos primeras reglas son
// las mismas de la web (apps/web/src/lib/todayCycles.ts).
import type { TodayCycleEntry } from '@cycles/shared';

type PendingSession = TodayCycleEntry['pending'][number];
type DoneSession = TodayCycleEntry['done'][number];

export type OpenCard = {
  kind: 'pending' | 'overdue' | 'upcoming';
  key: string;
  cycle: TodayCycleEntry['cycle'];
  session: PendingSession;
};
export type DoneCard = { kind: 'done'; key: string; cycle: TodayCycleEntry['cycle']; session: DoneSession };
export type TodayCard = OpenCard | DoneCard;

// Primero lo que está por hacer: la sesión en curso, las de hoy y las atrasadas (que no se
// presentan como de hoy). Después, por ciclo, lo hecho hoy o la próxima. Si un ciclo ya tiene una
// hecha hoy, solo suma otra si es de hoy o está en curso.
export function todayCards(entries: TodayCycleEntry[], todayIso: string): TodayCard[] {
  const now: OpenCard[] = [];
  const rest: TodayCard[] = [];
  for (const e of entries) {
    if (!e.upcoming) {
      const mine = e.done.length > 0 ? e.pending.filter(s => s.startedAt || s.scheduledDate?.slice(0, 10) === todayIso) : e.pending;
      for (const s of mine) {
        const day = s.scheduledDate?.slice(0, 10);
        const late = !s.startedAt && Boolean(day) && (day as string) < todayIso;
        now.push({ kind: late ? 'overdue' : 'pending', key: s.id, cycle: e.cycle, session: s });
      }
    }
    for (const s of e.done) {
      rest.push({ kind: 'done', key: s.id, cycle: e.cycle, session: s });
    }
    if (e.upcoming && e.done.length === 0) {
      for (const s of e.pending.slice(0, 1)) {
        rest.push({ kind: 'upcoming', key: s.id, cycle: e.cycle, session: s });
      }
    }
  }
  const rank = (c: OpenCard) => (c.session.startedAt ? 0 : c.kind === 'pending' ? 1 : 2);
  return [...now.sort((a, b) => rank(a) - rank(b)), ...rest];
}

// Qué va como tarjeta grande (oscura) y qué queda compacto.
// - La que se tocó con «Ver» (`focusKey`) pasa a grande y las demás quedan compactas.
// - Con una sesión empezada, esa es la grande y las otras quedan compactas.
// - Sin empezar ninguna, todas las de hoy y las atrasadas son grandes.
// `active` es la grande que además muestra sus ejercicios (empezada o elegida con «Ver»).
export function layoutCycles(entries: TodayCycleEntry[], todayIso: string, focusKey: string | null) {
  const cards = todayCards(entries, todayIso);
  const open = cards.filter((c): c is OpenCard => c.kind !== 'done');
  const focused = open.find(c => c.key === focusKey);
  const started = open.find(c => c.session.startedAt);
  const heroes: OpenCard[] = focused
    ? [focused]
    : started
      ? [started]
      : open.filter(c => c.kind !== 'upcoming');
  const compacts = cards.filter(c => !heroes.some(h => h.key === c.key));
  const active = focused ?? started ?? null;
  return { heroes, compacts, active };
}

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// «viernes 27»; con el mes si es otro («viernes 4 dic»). Las fechas se guardan a medianoche UTC.
export function cardDayLabel(iso: string, todayIso: string): string {
  const day = iso.slice(0, 10);
  const month = day.slice(0, 7) === todayIso.slice(0, 7) ? '' : ` ${MONTHS[Number(day.slice(5, 7)) - 1]}`;
  return `${WEEKDAYS[new Date(`${day}T00:00:00Z`).getUTCDay()]} ${Number(day.slice(8, 10))}${month}`;
}

export const exerciseCount = (n: number) => `${n} ${n === 1 ? 'ejercicio' : 'ejercicios'}`;

// Línea de una tarjeta compacta: «Para hoy, 4 ejercicios», «Próxima: viernes 27», etc.
export function compactLine(card: TodayCard, todayIso: string): string {
  if (card.kind === 'done') {
    return 'Hecha hoy';
  }
  const count = exerciseCount(card.session.sessionExercises.length);
  if (card.session.startedAt) {
    return `En curso, ${count}`;
  }
  const date = card.session.scheduledDate;
  if (card.kind === 'upcoming') {
    return date ? `Próxima: ${cardDayLabel(date, todayIso)}` : 'Próxima';
  }
  if (card.kind === 'overdue' && date) {
    return `Era para el ${cardDayLabel(date, todayIso)}`;
  }
  return date?.slice(0, 10) === todayIso ? `Para hoy, ${count}` : count;
}

// «Pendiente: Torso» si está atrasada: no se presenta como la de hoy.
export function cardTitle(card: TodayCard): string {
  return card.kind === 'overdue' ? `Pendiente: ${card.session.name}` : card.session.name;
}
