import type { WeeklySummary } from '@cycles/shared';

// Textos de la tarjeta «Esta semana» de Hoy (CYC-256, docs/diseno/vistas-app): el rango, el
// porcentaje del anillo y las tres cifras. Toda cifra dice su período y, si falta el dato,
// dice «Sin dato» (nunca queda en blanco ni en cero).
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const NO_DATA = 'Sin dato';

const parts = (day: string) => {
  const [, month, date] = day.split('-').map(Number);
  return { month: month - 1, date };
};

// «9 al 15 nov»; si cruza de mes, «30 nov al 6 dic».
export function weekRangeLabel(weekStart: string, weekEnd: string): string {
  const a = parts(weekStart);
  const b = parts(weekEnd);
  return a.month === b.month ? `${a.date} al ${b.date} ${MONTHS_SHORT[b.month]}` : `${a.date} ${MONTHS_SHORT[a.month]} al ${b.date} ${MONTHS_SHORT[b.month]}`;
}

// «9 al 15 de noviembre» para el lector de pantalla.
function spokenRange(weekStart: string, weekEnd: string): string {
  const a = parts(weekStart);
  const b = parts(weekEnd);
  return a.month === b.month ? `${a.date} al ${b.date} de ${MONTHS[b.month]}` : `${a.date} de ${MONTHS[a.month]} al ${b.date} de ${MONTHS[b.month]}`;
}

// Sesiones hechas sobre planeadas, de 0 a 100. Sin nada planeado, 0 (o 100 si igual hizo alguna).
export function weekPercent(s: Pick<WeeklySummary, 'sessionsDone' | 'sessionsPlanned'>): number {
  if (s.sessionsPlanned <= 0) {
    return s.sessionsDone > 0 ? 100 : 0;
  }
  return Math.min(100, Math.round((s.sessionsDone / s.sessionsPlanned) * 100));
}

// «1 h 35 min», «45 min», «2 h».
export function durationLabel(minutes: number | null): string {
  if (minutes === null || minutes <= 0) {
    return NO_DATA;
  }
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function spokenDuration(minutes: number | null): string {
  if (minutes === null || minutes <= 0) {
    return NO_DATA.toLowerCase();
  }
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  const hours = `${h} ${h === 1 ? 'hora' : 'horas'}`;
  const mins = `${m} ${m === 1 ? 'minuto' : 'minutos'}`;
  return h === 0 ? mins : m === 0 ? hours : `${hours} ${mins}`;
}

// «6,5» (una decimal con coma, sin «,0»).
export function effortLabel(srpe: number | null): string {
  return srpe === null ? NO_DATA : String(Math.round(srpe * 10) / 10).replace('.', ',');
}

export interface WeeklyCardData {
  range: string;
  percent: number;
  sessions: string;
  time: string;
  effort: string;
  /** La tarjeta entera, en una frase, para el lector de pantalla. */
  spoken: string;
}

// Sin sesiones planeadas ni hechas no hay semana que mostrar: la tarjeta no existe.
export function weeklyCard(summary: WeeklySummary | null): WeeklyCardData | null {
  if (!summary || (summary.sessionsPlanned <= 0 && summary.sessionsDone <= 0)) {
    return null;
  }
  const sessions = summary.sessionsPlanned > 0 ? `${summary.sessionsDone} de ${summary.sessionsPlanned}` : `${summary.sessionsDone}`;
  const time = durationLabel(summary.minutesTrained);
  const effort = effortLabel(summary.averageSrpe);
  const range = weekRangeLabel(summary.weekStart, summary.weekEnd);
  const effortSpoken = summary.averageSrpe === null ? 'esfuerzo medio sin dato' : `esfuerzo medio ${effort}`;
  return {
    range,
    percent: weekPercent(summary),
    sessions,
    time,
    effort,
    spoken: `Esta semana, ${spokenRange(summary.weekStart, summary.weekEnd)}: ${sessions} sesiones, tiempo entrenado ${spokenDuration(summary.minutesTrained)}, ${effortSpoken}`,
  };
}
