import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AthleteEventOccurrence, EventScope } from '@cycles/shared';
import { EventForm, type EventSubmit } from '../events/EventForm';
import { colors } from '../../theme/colors';
import { createEvent, deleteEvent, describeEventError, updateEvent } from '../../services/eventsApi';
import { emptyForm, type EventFormState } from '../../utils/eventForm';

interface Props {
  visible: boolean;
  /** Día en que se agrega (alta) o actividad que se edita. */
  day: string;
  editing: AthleteEventOccurrence | null;
  onClose: () => void;
  /** Se guardó o borró algo: hay que recargar las actividades. */
  onChanged: () => void;
}

// Estado inicial del formulario a partir de una ocurrencia existente.
export function formFromEvent(event: AthleteEventOccurrence): EventFormState {
  return {
    type: event.type,
    sport: event.sport,
    title: event.title,
    date: event.date,
    allDay: event.allDay,
    startTime: event.startTime ?? '',
    durationMin: event.durationMin ? String(event.durationMin) : '',
    intensity: event.intensity,
    notes: event.notes ?? '',
    repeats: event.repeat !== null,
    repeatDays: event.repeat ? [...event.repeat.days] : [],
    until: event.repeat?.until ?? '',
  };
}

// Hoja inferior con el formulario de alta y edición (CYC-252). Maneja el envío, el borrado y
// el mensaje de error; la presentación final (estilo) la define el diseño.
export function EventSheet({ visible, day, editing, onClose, onChanged }: Props) {
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>) => {
    if (saving) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await action();
      onChanged();
      onClose();
    } catch (err) {
      setError(describeEventError(err));
    } finally {
      setSaving(false);
    }
  };

  const submit = (submitted: EventSubmit) =>
    run(() =>
      submitted.kind === 'create'
        ? createEvent(submitted.input)
        : updateEvent((editing as AthleteEventOccurrence).seriesId, submitted.input),
    );

  const remove = (scope: EventScope) =>
    run(() => deleteEvent((editing as AthleteEventOccurrence).seriesId, scope, (editing as AthleteEventOccurrence).date));

  if (!visible) {
    return null;
  }
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.grabber} />
        <EventForm
          // Reinicia el formulario al cambiar de actividad o de día.
          key={editing ? `${editing.seriesId}-${editing.date}` : `nuevo-${day}`}
          initial={editing ? formFromEvent(editing) : emptyForm(day)}
          editing={editing ? { occurrenceDate: editing.date, isSeries: editing.repeat !== null } : undefined}
          saving={saving}
          error={error}
          onSubmit={submit}
          onDelete={editing ? remove : undefined}
          onCancel={onClose}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { maxHeight: '88%', backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.grayBorder, marginTop: 8 },
});
