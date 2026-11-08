import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { AthleteEventOccurrence } from '@cycles/shared';
import { Pearl } from '../pearl/Pearl';
import { kindFor } from '../events/eventKinds';
import { Icon } from '../Icon';
import { EventRow, SessionRow, type DaySession } from './DayDetail';
import { colors } from '../../theme/colors';
import { viewShadow } from '../../theme/elevation';
import { WEEKDAY_LETTER, calendarWeek, longDay, monthCell } from '../../utils/eventCalendar';

// Lista de días con sus actividades (y sesiones del coach si se pasan), con un encabezado por
// día, como en el diseño del calendario semanal. Los días vacíos no ocupan lugar.
interface ListProps {
  days: string[];
  today: string;
  eventsByDay: Record<string, AthleteEventOccurrence[]>;
  sessionsByDay?: Record<string, DaySession[]>;
  onOpenEvent: (event: AthleteEventOccurrence) => void;
  onOpenSession?: (sessionId: string) => void;
}

export function DaysList({ days, today, eventsByDay, sessionsByDay, onOpenEvent, onOpenSession }: ListProps) {
  const filled = days.filter(day => (eventsByDay[day]?.length ?? 0) + (sessionsByDay?.[day]?.length ?? 0) > 0);
  return (
    <>
      {filled.map(day => (
        <View key={day} style={styles.dayBlock}>
          <Text style={[styles.dayTitle, day === today && styles.dayTitleToday]} accessibilityRole="header">
            {day === today ? `Hoy, ${longDay(day)}` : longDay(day)}
          </Text>
          {(sessionsByDay?.[day] ?? []).map(session => (
            <SessionRow key={session.id} session={session} onOpen={onOpenSession ?? (() => {})} />
          ))}
          {(eventsByDay[day] ?? []).map((event, index) => (
            <EventRow key={`${event.seriesId}-${index}`} event={event} onOpen={onOpenEvent} />
          ))}
        </View>
      ))}
    </>
  );
}

interface Props {
  /** Cualquier día de la semana que se muestra (se muestra de lunes a domingo). */
  anchor: string;
  today: string;
  eventsByDay: Record<string, AthleteEventOccurrence[]>;
  sessionsByDay: Record<string, DaySession[]>;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onOpenEvent: (event: AthleteEventOccurrence) => void;
  onOpenSession: (sessionId: string) => void;
  onAdd: (day: string) => void;
}

const PEARL = 16;

// Calendario por fechas reales (modo «Fechas», CYC-252): semana de lunes a domingo sin
// depender de un ciclo ni de un coach, con flechas y «Ir a hoy». Tira de 7 días con las
// perlas de sus actividades y debajo la lista por día.
export function WeekDatesView({ anchor, today, eventsByDay, sessionsByDay, onPrev, onNext, onToday, onOpenEvent, onOpenSession, onAdd }: Props) {
  const week = calendarWeek(anchor);
  const first = week[0];
  const last = week[6];
  const title = `${first.day} al ${last.day}`;
  const empty = week.every(d => (eventsByDay[d.iso]?.length ?? 0) + (sessionsByDay[d.iso]?.length ?? 0) === 0);
  return (
    <>
      <View style={styles.card}>
        <View style={styles.head}>
          <TouchableOpacity onPress={onPrev} accessibilityRole="button" accessibilityLabel="Semana anterior" style={styles.arrow} hitSlop={8}>
            <Icon name="chevronLeft" size={22} color={colors.ink} />
          </TouchableOpacity>
          <Text style={styles.title} accessibilityRole="header">{`Semana del ${title}`}</Text>
          <TouchableOpacity onPress={onNext} accessibilityRole="button" accessibilityLabel="Semana siguiente" style={[styles.arrow, styles.flip]} hitSlop={8}>
            <Icon name="chevronLeft" size={22} color={colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onToday} accessibilityRole="button" accessibilityLabel="Ir a hoy" style={styles.todayButton}>
            <Text style={styles.todayText}>Hoy</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.strip}>
          {week.map(day => {
            const events = eventsByDay[day.iso] ?? [];
            const cell = monthCell(day, events);
            const isToday = day.iso === today;
            return (
              <View key={day.iso} style={styles.stripDay}>
                <Text style={styles.letter} accessibilityElementsHidden importantForAccessibility="no">
                  {WEEKDAY_LETTER[day.weekday]}
                </Text>
                <View style={[styles.number, isToday && styles.numberToday]}>
                  <Text style={[styles.numberText, isToday && styles.numberTextToday]}>{day.day}</Text>
                </View>
                <View style={styles.pearls}>
                  {cell.shown.map((event, index) => (
                    <Pearl key={`${event.seriesId}-${index}`} kind={kindFor(event)} size={PEARL} />
                  ))}
                  {cell.extra > 0 && <Text style={styles.more}>{`+${cell.extra}`}</Text>}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <DaysList
        days={week.map(d => d.iso)}
        today={today}
        eventsByDay={eventsByDay}
        sessionsByDay={sessionsByDay}
        onOpenEvent={onOpenEvent}
        onOpenSession={onOpenSession}
      />

      {empty && (
        <View style={styles.card}>
          <Text style={styles.emptyTitle}>Esta semana no tienes nada</Text>
          <Text style={styles.emptyText}>Agrega lo que haces por tu cuenta: voleibol, partidos, viajes.</Text>
          <TouchableOpacity style={styles.add} onPress={() => onAdd(today >= first.iso && today <= last.iso ? today : first.iso)} accessibilityRole="button" accessibilityLabel="Agregar actividad esta semana">
            <Text style={styles.addText}>Agregar actividad</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bg, borderRadius: 22, padding: 12, marginBottom: 8, ...viewShadow },
  head: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  title: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  flip: { transform: [{ scaleX: -1 }] },
  todayButton: { minHeight: 44, minWidth: 44, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: colors.blueTint },
  todayText: { fontSize: 13, fontWeight: '700', color: colors.blue },
  strip: { flexDirection: 'row' },
  stripDay: { flex: 1, alignItems: 'center', gap: 2 },
  letter: { fontSize: 11, fontWeight: '700', color: colors.inkSecondary },
  number: { minWidth: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  numberToday: { backgroundColor: colors.blue },
  numberText: { fontSize: 13, fontWeight: '700', color: colors.ink },
  numberTextToday: { color: colors.onBlue },
  pearls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: PEARL },
  more: { fontSize: 11, fontWeight: '800', color: colors.inkSecondary },
  dayBlock: { backgroundColor: colors.bg, borderRadius: 22, padding: 12, marginBottom: 8, ...viewShadow },
  dayTitle: { fontSize: 15, fontWeight: '800', color: colors.ink, marginBottom: 4 },
  dayTitleToday: { color: colors.blue },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.ink, marginBottom: 4 },
  emptyText: { fontSize: 14, color: colors.inkSecondary },
  add: { minHeight: 44, borderRadius: 999, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  addText: { color: colors.onBlue, fontSize: 15, fontWeight: '700' },
});
