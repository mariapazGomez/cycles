import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { AthleteEventOccurrence, EventIntensity } from '@cycles/shared';
import { Pearl } from '../pearl/Pearl';
import { PEARL_KINDS } from '../pearl/kinds';
import { kindFor } from '../events/eventKinds';
import { colors } from '../../theme/colors';
import { viewShadow } from '../../theme/elevation';
import { longDay, timeLabel } from '../../utils/eventCalendar';
import { useViewScale } from '../../hooks/useViewScale';
import { scaledIcon } from '../../utils/viewScale';

export interface DaySession {
  id: string;
  name: string;
  done: boolean;
}

interface Props {
  day: string;
  events: AthleteEventOccurrence[];
  sessions: DaySession[];
  onOpenEvent: (event: AthleteEventOccurrence) => void;
  onOpenSession: (sessionId: string) => void;
  onAdd: () => void;
}

const INTENSITY_LABEL: Record<EventIntensity, string> = { low: 'Suave', medium: 'Media', high: 'Alta' };

// Filas reutilizables del día (detalle del mes y listas de la semana).
export function SessionRow({ session, onOpen }: { session: DaySession; onOpen: (sessionId: string) => void }) {
  const scale = useViewScale();
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onOpen(session.id)}
      accessibilityRole="button"
      accessibilityLabel={`Sesión del coach: ${session.name}, ${session.done ? 'hecha' : 'pendiente'}. Abrir`}>
      <Pearl kind={PEARL_KINDS.coachStrength} size={scaledIcon(26, scale)} />
      <View style={styles.info}>
        <Text style={styles.name}>{session.name}</Text>
        <Text style={styles.sub}>{session.done ? 'Hecha' : 'Pendiente'}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function EventRow({ event, onOpen }: { event: AthleteEventOccurrence; onOpen: (event: AthleteEventOccurrence) => void }) {
  const scale = useViewScale();
  const kind = kindFor(event);
  const intensity = event.intensity ? INTENSITY_LABEL[event.intensity] : null;
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onOpen(event)}
      accessibilityRole="button"
      accessibilityLabel={`${kind.label}: ${event.title}, ${timeLabel(event)}${intensity ? `, intensidad ${intensity.toLowerCase()}` : ''}${event.repeat ? ', se repite' : ''}. Abrir`}>
      <Pearl kind={kind} size={scaledIcon(26, scale)} />
      <View style={styles.info}>
        <Text style={styles.name}>{event.title}</Text>
        <Text style={styles.sub}>{[timeLabel(event), intensity].filter(Boolean).join(', ')}</Text>
      </View>
      {event.repeat && <Text style={styles.series}>Serie</Text>}
    </TouchableOpacity>
  );
}

// Detalle del día elegido en el mes (CYC-254): sesiones del coach primero, actividades
// después (como en el diseño). El estado va siempre en palabras, no solo en color.
export function DayDetail({ day, events, sessions, onOpenEvent, onOpenSession, onAdd }: Props) {
  const empty = events.length === 0 && sessions.length === 0;
  return (
    <View style={styles.card}>
      <Text style={styles.title} accessibilityRole="header">
        {longDay(day)}
      </Text>

      {sessions.map(session => (
        <SessionRow key={session.id} session={session} onOpen={onOpenSession} />
      ))}

      {events.map((event, index) => (
        <EventRow key={`${event.seriesId}-${index}`} event={event} onOpen={onOpenEvent} />
      ))}

      {empty && <Text style={styles.empty}>No hay nada este día.</Text>}

      <TouchableOpacity style={styles.add} onPress={onAdd} accessibilityRole="button" accessibilityLabel="Agregar actividad este día">
        <Text style={styles.addText}>Agregar actividad</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bg, borderRadius: 22, padding: 12, marginBottom: 8, ...viewShadow },
  title: { fontSize: 15, fontWeight: '800', color: colors.ink, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingVertical: 4 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: colors.ink },
  sub: { fontSize: 13, color: colors.inkSecondary },
  series: { fontSize: 11, fontWeight: '700', color: colors.inkSecondary },
  empty: { fontSize: 14, color: colors.inkSecondary, paddingVertical: 8 },
  add: { minHeight: 44, borderRadius: 999, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  addText: { color: colors.onBlue, fontSize: 15, fontWeight: '700' },
});
