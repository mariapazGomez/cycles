import type { TrainingSession } from '@cycles/shared';
import { intensityRamp, muscleColors } from '../theme/colors';
import { toLocalDay } from './planCalendar';

export type GroupKey = keyof typeof muscleColors;
export type Metric = 'sets' | 'kg';

// El orden es el de apilado (de abajo hacia arriba) y el de la paleta.
export const GROUPS: Array<{ key: GroupKey; label: string; color: string }> = [
  { key: 'legs', label: 'Piernas', color: muscleColors.legs },
  { key: 'back', label: 'Espalda', color: muscleColors.back },
  { key: 'chest', label: 'Pecho', color: muscleColors.chest },
  { key: 'shoulders', label: 'Hombros', color: muscleColors.shoulders },
  { key: 'glutes', label: 'Glúteos', color: muscleColors.glutes },
  { key: 'arms', label: 'Brazos', color: muscleColors.arms },
  { key: 'core', label: 'Core', color: muscleColors.core },
];

// Lo que devuelve GET /me/summary: una entrada por sesión entrenada.
export interface MuscleDay {
  sessionId: string;
  name: string;
  weekNumber: number;
  trainedAt: string;
  sets: Record<GroupKey, number>;
  kg: Record<GroupKey, number>;
}

export interface Bar {
  id: string;
  line1: string;
  line2: string;
  title: string;
  values: number[];
}

const WEEKDAY_LETTERS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const WEEKDAY_NAMES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const toValues = (day: MuscleDay, metric: Metric) => GROUPS.map(g => day[metric][g.key] ?? 0);
const add = (a: number[], b: number[]) => a.map((v, i) => v + b[i]);
export const total = (values: number[]) => values.reduce((a, b) => a + b, 0);

// Una barra por día entrenado (varias sesiones el mismo día se suman). El día
// es el local del atleta, no el UTC del servidor.
export function barsByDay(days: MuscleDay[], metric: Metric): Bar[] {
  const byDay = new Map<string, { date: Date; values: number[] }>();
  [...days]
    .sort((a, b) => Date.parse(a.trainedAt) - Date.parse(b.trainedAt))
    .forEach(day => {
      const date = new Date(day.trainedAt);
      const key = toLocalDay(date);
      const current = byDay.get(key);
      byDay.set(key, {
        date: current?.date ?? date,
        values: add(current?.values ?? GROUPS.map(() => 0), toValues(day, metric)),
      });
    });
  return [...byDay.entries()].map(([key, { date, values }]) => ({
    id: key,
    line1: WEEKDAY_LETTERS[date.getDay()],
    line2: String(date.getDate()),
    title: `${WEEKDAY_NAMES[date.getDay()]} ${date.getDate()} de ${MONTHS_SHORT[date.getMonth()]}`,
    values,
  }));
}

// Una barra por semana del plan con series registradas.
export function barsByWeek(days: MuscleDay[], metric: Metric): Bar[] {
  const byWeek = new Map<number, number[]>();
  days.forEach(day => {
    byWeek.set(day.weekNumber, add(byWeek.get(day.weekNumber) ?? GROUPS.map(() => 0), toValues(day, metric)));
  });
  return [...byWeek.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, values]) => ({
      id: `w${week}`,
      line1: `S${week}`,
      line2: '',
      title: `Semana ${week}`,
      values,
    }));
}

// Total por grupo de todas las sesiones, o solo de una semana del plan.
export function totalsByGroup(days: MuscleDay[], metric: Metric, week: number | 'all' = 'all'): number[] {
  return days
    .filter(day => week === 'all' || day.weekNumber === week)
    .reduce((acc, day) => add(acc, toValues(day, metric)), GROUPS.map(() => 0));
}

export interface Share {
  key: GroupKey;
  label: string;
  color: string;
  value: number;
  pct: number;
}

// Reparto de un conjunto de valores, de mayor a menor, sin los grupos en cero.
export function shares(values: number[]): Share[] {
  const sum = total(values);
  return GROUPS.map((g, i) => ({ ...g, value: values[i], pct: sum > 0 ? (values[i] / sum) * 100 : 0 }))
    .filter(s => s.value > 0)
    .sort((a, b) => b.value - a.value);
}

const NICE_STEPS = [5, 10, 20, 25, 50, 100, 250, 500, 1000, 2000, 2500, 5000, 10000, 25000];

// Escala del eje: un paso "redondo" tal que haya como máximo 5 divisiones.
export function axisScale(maxValue: number): { step: number; max: number } {
  const step = NICE_STEPS.find(s => Math.ceil(maxValue / s) <= 5) ?? 25000;
  return { step, max: Math.max(step, Math.ceil(maxValue / step) * step) };
}

const hex = (c: string) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));

// Color de intensidad (0 a 1) sobre la rampa de un solo azul.
export function intensityColor(t: number): string {
  const s = Math.max(0, Math.min(1, t)) * (intensityRamp.length - 1);
  const i = Math.min(Math.floor(s), intensityRamp.length - 2);
  const f = s - i;
  const a = hex(intensityRamp[i]);
  const b = hex(intensityRamp[i + 1]);
  const mix = a.map((x, k) => Math.round(x + (b[k] - x) * f));
  return `#${mix.map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

// Color de un grupo en el mapa: gris si no tiene carga; si tiene, la rampa
// desde un piso (para que nunca se confunda con el gris) hasta el máximo.
export function groupFill(value: number, max: number, noLoad: string): string {
  return value <= 0 || max <= 0 ? noLoad : intensityColor(0.1 + 0.9 * (value / max));
}

// Semanas seguidas del plan con al menos una sesión hecha, contadas hacia
// atrás desde la actual. Si la semana actual aún no tiene ninguna hecha, no
// rompe la racha: se cuenta desde la anterior.
export function weekStreak(sessions: TrainingSession[], currentWeek: number): number {
  const done = new Set(sessions.filter(s => s.status === 'completed').map(s => s.weekNumber));
  let week = currentWeek;
  if (!done.has(week)) {
    week -= 1;
  }
  let streak = 0;
  while (week >= 1 && done.has(week)) {
    streak += 1;
    week -= 1;
  }
  return streak;
}
