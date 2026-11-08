import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import type { AthleteEventOccurrence } from '@cycles/shared';
import { Pearl } from '../pearl/Pearl';
import { kindFor } from '../events/eventKinds';
import { colors } from '../../theme/colors';
import { todaySummary } from '../../utils/eventCalendar';

interface Props {
  events: AthleteEventOccurrence[];
  onOpen: () => void;
}

// Fila discreta «Hoy también: voleibol, 19:00» (CYC-237 y CYC-256), con borde punteado. Con
// varias actividades, «voleibol y 1 más». Al tocarla abre el calendario. Sin actividades, no existe.
export function TodayAlso({ events, onOpen }: Props) {
  if (events.length === 0) {
    return null;
  }
  const summary = todaySummary(events);
  return (
    <TouchableOpacity style={styles.row} onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${summary}. Abrir calendario`}>
      <Pearl kind={kindFor(events[0])} size={22} />
      <Text style={styles.text} numberOfLines={2}>
        {summary}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.grayMid,
    marginBottom: 8,
  },
  text: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink },
});
