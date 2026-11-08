import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { AthleteEventOccurrence } from '@cycles/shared';
import { Pearl } from '../pearl/Pearl';
import { kindFor } from '../events/eventKinds';
import { Icon } from '../Icon';
import { colors, viewColors } from '../../theme/colors';
import { viewShadow } from '../../theme/elevation';
import { useViewScale } from '../../hooks/useViewScale';
import { scaledIcon } from '../../utils/viewScale';
import { WEEKDAY_LETTER, longDay, monthCell, monthGrid, monthTitle } from '../../utils/eventCalendar';

// Sesión del coach en un día, reducida a lo que el mes necesita: un punto por sesión
// (oscuro = hecha, aro azul = pendiente).
export interface MonthSession {
  id: string;
  day: string;
  done: boolean;
}

interface Props {
  year: number;
  month: number;
  today: string;
  selected: string;
  eventsByDay: Record<string, AthleteEventOccurrence[]>;
  sessions: MonthSession[];
  /** Letra grande: una sola perla por día y «+N». */
  compact?: boolean;
  onSelect: (iso: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

const CELL_MIN_HEIGHT = 54;
const PEARL_SIZE = 19;

// Vista de mes completa (CYC-254): cuadrícula de semanas de lunes a domingo, con la perla
// de cada actividad (máximo dos, luego «+N»), un punto por sesión del coach, el día de hoy
// resaltado y el día elegido con borde. Los números de los días miden 11 px.
export function MonthView({ year, month, today, selected, eventsByDay, sessions, compact, onSelect, onPrev, onNext, onToday }: Props) {
  const rows = monthGrid(year, month);
  const scale = useViewScale();
  // Letra grande o pantalla angosta: una sola perla por día (el detalle del día queda completo).
  const oneBead = compact ?? scale.big;
  const pearl = scaledIcon(PEARL_SIZE, scale);
  const cellHeight = Math.round(CELL_MIN_HEIGHT * scale.icon);
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <TouchableOpacity onPress={onPrev} accessibilityRole="button" accessibilityLabel="Mes anterior" style={styles.arrow} hitSlop={8}>
          <Icon name="chevronLeft" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header">
          {monthTitle(year, month)}
        </Text>
        <TouchableOpacity onPress={onNext} accessibilityRole="button" accessibilityLabel="Mes siguiente" style={[styles.arrow, styles.flip]} hitSlop={8}>
          <Icon name="chevronLeft" size={22} color={colors.ink} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onToday} accessibilityRole="button" accessibilityLabel="Ir a hoy" style={styles.todayButton}>
          <Text style={styles.todayText}>Hoy</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekdays}>
        {WEEKDAY_LETTER.map((letter, index) => (
          <Text key={index} style={styles.weekday} accessibilityElementsHidden importantForAccessibility="no">
            {letter}
          </Text>
        ))}
      </View>

      {rows.map(row => (
        <View key={row[0].iso} style={styles.row}>
          {row.map(day => {
            const events = day.inMonth ? eventsByDay[day.iso] ?? [] : [];
            const dots = day.inMonth ? sessions.filter(s => s.day === day.iso) : [];
            const cell = monthCell(day, events, oneBead);
            const isToday = day.iso === today;
            const isSelected = day.iso === selected;
            const spoken = [
              longDay(day.iso),
              isToday ? 'hoy' : '',
              events.length ? `${events.length} ${events.length === 1 ? 'actividad' : 'actividades'}` : '',
              dots.length ? `${dots.length} ${dots.length === 1 ? 'sesión' : 'sesiones'} del coach` : '',
            ]
              .filter(Boolean)
              .join(', ');
            return (
              <TouchableOpacity
                key={day.iso}
                disabled={!day.inMonth}
                onPress={() => onSelect(day.iso)}
                accessibilityRole="button"
                accessibilityLabel={spoken}
                accessibilityState={{ selected: isSelected, disabled: !day.inMonth }}
                style={[styles.cell, { minHeight: cellHeight }, isSelected && styles.cellSelected, !day.inMonth && styles.cellOff]}>
                <View style={[styles.number, isToday && styles.numberToday]}>
                  <Text style={[styles.numberText, isToday && styles.numberTextToday]}>{day.day}</Text>
                </View>
                <View style={styles.pearls}>
                  {cell.shown.map((event, index) => (
                    <Pearl key={`${event.seriesId}-${index}`} kind={kindFor(event)} size={pearl} />
                  ))}
                  {cell.extra > 0 && <Text style={styles.more}>{`+${cell.extra}`}</Text>}
                </View>
                {dots.length > 0 && (
                  <View style={styles.dots}>
                    {dots.slice(0, 3).map(s => (
                      <View key={s.id} style={[styles.dot, s.done ? styles.dotDone : styles.dotPending]} />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bg, borderRadius: 22, padding: 10, marginBottom: 8, ...viewShadow },
  head: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  title: { flex: 1, fontSize: 17, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  flip: { transform: [{ scaleX: -1 }] },
  todayButton: { minHeight: 44, minWidth: 44, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: colors.blueTint },
  todayText: { fontSize: 13, fontWeight: '700', color: colors.blue },
  weekdays: { flexDirection: 'row', marginBottom: 2 },
  weekday: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.inkSecondary },
  row: { flexDirection: 'row' },
  cell: { flex: 1, minHeight: CELL_MIN_HEIGHT, alignItems: 'center', paddingTop: 3, paddingBottom: 3, borderRadius: 12, borderWidth: 2, borderColor: 'transparent' },
  cellSelected: { borderColor: colors.blue, backgroundColor: colors.blueTint },
  cellOff: { opacity: 0.3 },
  number: { minWidth: 20, minHeight: 20, paddingHorizontal: 3, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  numberToday: { backgroundColor: colors.blue },
  numberText: { fontSize: 11, fontWeight: '700', color: colors.ink },
  numberTextToday: { color: colors.onBlue },
  pearls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, marginTop: 2 },
  more: { fontSize: 11, fontWeight: '800', color: colors.inkSecondary },
  dots: { flexDirection: 'row', gap: 3, marginTop: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotDone: { backgroundColor: colors.ink },
  dotPending: { borderWidth: 1.5, borderColor: colors.blue, backgroundColor: viewColors.surfaceMuted },
});
