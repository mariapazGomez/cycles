import type { Exercise, ExerciseLog, SessionExercise } from '@cycles/shared';
import { GROUPS, type GroupKey } from './muscleSummary';

// Lo que lleva la imagen compartible de una sesión (CYC-289): el mapa muscular
// de la sesión y tres datos. Nada de pesos, esfuerzo, dolor, notas ni nombres
// de personas: solo lo que decidió la usuaria en CYC-288.
export interface ShareData {
  name: string;
  exercises: number;
  sets: number;
  minutes: number | null;
  groups: Record<GroupKey, number>;
}

export type ShareFormat = 'post' | 'story' | 'sticker' | 'bare';

// Cada formato tiene dos variantes: claro/oscuro (con fondo) y texto blanco/oscuro (sin fondo).
export const SHARE_FORMATS: Array<{
  key: ShareFormat;
  label: string;
  width: number;
  height: number;
  variants: [string, string];
}> = [
  { key: 'post', label: 'Post', width: 1080, height: 1350, variants: ['Claro', 'Oscuro'] },
  { key: 'story', label: 'Historia', width: 1080, height: 1920, variants: ['Claro', 'Oscuro'] },
  { key: 'sticker', label: 'Sticker', width: 640, height: 344, variants: ['Claro', 'Oscuro'] },
  { key: 'bare', label: 'Sin fondo', width: 640, height: 344, variants: ['Texto blanco', 'Texto oscuro'] },
];

type Item = SessionExercise & { exercise: Exercise; logs: ExerciseLog[] };

const emptyGroups = () => Object.fromEntries(GROUPS.map(g => [g.key, 0])) as Record<GroupKey, number>;

// Series por grupo muscular (el principal de cada ejercicio, como el Resumen del
// servidor), ejercicios terminados, series y minutos entre el inicio y la última serie.
export function buildShareData(name: string, items: Item[], startedAt?: string | null): ShareData {
  const groups = emptyGroups();
  let sets = 0;
  let exercises = 0;
  let last = NaN;
  for (const item of items) {
    const group = item.exercise.muscleGroup as GroupKey | undefined;
    if (group && group in groups) {
      groups[group] += item.logs.length;
    }
    sets += Math.min(item.logs.length, item.targetSets);
    if (item.logs.length >= item.targetSets) {
      exercises += 1;
    }
    for (const log of item.logs) {
      const t = Date.parse(log.loggedAt);
      if (!Number.isNaN(t) && !(t <= last)) {
        last = t;
      }
    }
  }
  const start = startedAt ? Date.parse(startedAt) : NaN;
  const minutes = Number.isFinite(start) && Number.isFinite(last) && last >= start ? Math.max(1, Math.round((last - start) / 60000)) : null;
  return { name, exercises, sets, minutes, groups };
}

// Texto alternativo de la imagen compartida.
export function shareAltText(data: ShareData): string {
  const top = GROUPS.filter(g => data.groups[g.key] > 0)
    .sort((a, b) => data.groups[b.key] - data.groups[a.key])
    .slice(0, 2)
    .map(g => g.label.toLowerCase());
  const parts = [`Sesión ${data.name}: ${data.exercises} ${data.exercises === 1 ? 'ejercicio' : 'ejercicios'}, ${data.sets} ${data.sets === 1 ? 'serie' : 'series'}`];
  if (data.minutes !== null) {
    parts.push(`${data.minutes} minutos`);
  }
  return `${parts.join(', ')}.${top.length > 0 ? ` Grupos más trabajados: ${top.join(' y ')}.` : ''}`;
}

// Tamaño de letra del título para que un nombre largo quepa.
export function fitTitle(name: string, base: number): { text: string; size: number } {
  const text = name.length > 22 ? `${name.slice(0, 21)}…` : name;
  const size = text.length <= 9 ? base : Math.max(Math.round(base * 0.45), Math.round((base * 9) / text.length));
  return { text, size };
}
