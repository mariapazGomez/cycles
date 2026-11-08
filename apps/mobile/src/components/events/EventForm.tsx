import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { EventIntensity, EventScope, EventSport, EventType } from '@cycles/shared';
import { Pearl } from '../pearl/Pearl';
import { PEARL_KINDS, type PearlKind } from '../pearl/kinds';
import { SPORT_PEARL, TYPE_PEARL } from './eventKinds';
import { colors, viewColors } from '../../theme/colors';
import { WEEKDAY_SHORT } from '../../utils/eventCalendar';
import {
  buildCreateInput,
  buildUpdateInput,
  hasErrors,
  repeatSummary,
  TITLE_MAX,
  validateForm,
  type EventFormState,
  type FormErrors,
} from '../../utils/eventForm';
import type { CreateAthleteEventInput, UpdateAthleteEventInput } from '../../services/eventsApi';

// FORMULARIO PROVISIONAL (CYC-252): estado, validación y envío completos, sin estilo final.
// El diseño (vista de mes, íconos, hoja) llega aparte y reemplaza solo la presentación.
export const TYPE_LABEL: Record<EventType, string> = {
  training: 'Entrenamiento',
  match: 'Partido o competencia',
  rest: 'Descanso activo',
  travel: 'Viaje',
  injury: 'Lesión',
  other: 'Otro',
};
const INTENSITY_LABEL: Record<EventIntensity, string> = { low: 'Suave', medium: 'Media', high: 'Alta' };

export type EventSubmit =
  | { kind: 'create'; input: CreateAthleteEventInput }
  | { kind: 'update'; scope: EventScope; input: UpdateAthleteEventInput };

interface Props {
  initial: EventFormState;
  /** Editando una ocurrencia existente (la fecha de esa ocurrencia). */
  editing?: { occurrenceDate: string; isSeries: boolean };
  saving?: boolean;
  error?: string | null;
  onSubmit: (submit: EventSubmit) => void;
  onDelete?: (scope: EventScope) => void;
  onCancel: () => void;
}

function Chip({ label, selected, onPress, kind }: { label: string; selected: boolean; onPress: () => void; kind?: PearlKind }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipOn]}>
      {kind && <Pearl kind={kind} size={22} />}
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

// Tres perlas llenas según la intensidad (el motivo de la marca): suave 1, media 2, alta 3.
const INTENSITY_BEADS: Record<EventIntensity, number> = { low: 1, medium: 2, high: 3 };

function IntensityChip({ level, selected, onPress }: { level: EventIntensity; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={INTENSITY_LABEL[level]}
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipOn]}>
      <View style={styles.beads}>
        {[1, 2, 3].map(n => (
          <View key={n} style={[styles.bead, n <= INTENSITY_BEADS[level] && (selected ? styles.beadOnSelected : styles.beadOn)]} />
        ))}
      </View>
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{INTENSITY_LABEL[level]}</Text>
    </TouchableOpacity>
  );
}

export function EventForm({ initial, editing, saving, error, onSubmit, onDelete, onCancel }: Props) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  // En una serie, «solo este día» es lo predeterminado (diseño).
  const [scope, setScope] = useState<EventScope>('occurrence');
  const set = <K extends keyof EventFormState>(key: K, value: EventFormState[K]) => setForm(prev => ({ ...prev, [key]: value }));

  const submit = () => {
    const found = validateForm(form);
    setErrors(found);
    if (hasErrors(found) || saving) {
      return;
    }
    if (editing) {
      const effective: EventScope = editing.isSeries ? scope : 'series';
      onSubmit({ kind: 'update', scope: effective, input: buildUpdateInput(form, effective, editing.occurrenceDate) });
    } else {
      onSubmit({ kind: 'create', input: buildCreateInput(form) });
    }
  };

  const toggleDay = (day: number) =>
    set('repeatDays', form.repeatDays.includes(day) ? form.repeatDays.filter(d => d !== day) : [...form.repeatDays, day]);
  const summary = repeatSummary(form);
  const wholeSeriesOnly = Boolean(editing?.isSeries) && scope === 'occurrence';
  // La API no deja mover una ocurrencia en la v1 (CYC-251): con «solo este día» la fecha no cambia.
  const dateLocked = wholeSeriesOnly;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{editing ? 'Editar actividad' : 'Agregar al calendario'}</Text>
      <Text style={styles.hint}>Solo lo ve tu coach.</Text>

      <View style={styles.row}>
        {(Object.keys(TYPE_LABEL) as EventType[]).map(type => (
          <Chip key={type} label={TYPE_LABEL[type]} kind={PEARL_KINDS[TYPE_PEARL[type]]} selected={form.type === type} onPress={() => set('type', type)} />
        ))}
      </View>

      {form.type === 'training' && (
        <>
          <Text style={styles.label}>Deporte</Text>
          <View style={styles.row}>
            {(Object.keys(SPORT_PEARL) as EventSport[]).map(sport => (
              <Chip
                key={sport}
                label={PEARL_KINDS[SPORT_PEARL[sport]].label}
                kind={PEARL_KINDS[SPORT_PEARL[sport]]}
                selected={form.sport === sport}
                // Elegir un deporte propone su nombre si aún no se escribió uno.
                onPress={() => setForm(prev => ({ ...prev, sport, title: prev.title.trim() ? prev.title : PEARL_KINDS[SPORT_PEARL[sport]].label }))}
              />
            ))}
          </View>
        </>
      )}
      <Text style={styles.label}>{form.type === 'match' ? 'Nombre del evento' : 'Nombre'}</Text>
      <TextInput
        style={styles.input}
        value={form.title}
        onChangeText={value => set('title', value)}
        accessibilityLabel="Nombre"
        placeholder="Voleibol"
        maxLength={TITLE_MAX}
      />
      {errors.title && <Text style={styles.error}>{errors.title}</Text>}

      <Text style={styles.label}>Fecha (AAAA-MM-DD)</Text>
      <TextInput
        style={[styles.input, dateLocked && styles.locked]}
        value={form.date}
        onChangeText={value => set('date', value)}
        editable={!dateLocked}
        accessibilityLabel="Fecha"
        autoCapitalize="none"
      />
      {dateLocked && <Text style={styles.hint}>Para mover un día, elimínalo y crea otro.</Text>}
      {errors.date && <Text style={styles.error}>{errors.date}</Text>}

      <View style={styles.switchRow}>
        <Text style={styles.label}>Todo el día</Text>
        <Switch value={form.allDay} onValueChange={value => set('allDay', value)} accessibilityLabel="Todo el día" />
      </View>
      {!form.allDay && (
        <>
          <Text style={styles.label}>Hora de inicio (19:00)</Text>
          <TextInput style={styles.input} value={form.startTime} onChangeText={value => set('startTime', value)} accessibilityLabel="Hora de inicio" keyboardType="numbers-and-punctuation" />
          {errors.startTime && <Text style={styles.error}>{errors.startTime}</Text>}
          <Text style={styles.label}>Duración (minutos)</Text>
          <View style={styles.row}>
            {[60, 90, 120].map(minutes => (
              <Chip key={minutes} label={`${minutes} min`} selected={form.durationMin === String(minutes)} onPress={() => set('durationMin', String(minutes))} />
            ))}
          </View>
          <TextInput style={styles.input} value={form.durationMin} onChangeText={value => set('durationMin', value.replace(/\D/g, ''))} accessibilityLabel="Duración en minutos" keyboardType="number-pad" />
          {errors.durationMin && <Text style={styles.error}>{errors.durationMin}</Text>}
        </>
      )}

      <Text style={styles.label}>Intensidad</Text>
      <View style={styles.row}>
        {(Object.keys(INTENSITY_LABEL) as EventIntensity[]).map(level => (
          <IntensityChip key={level} level={level} selected={form.intensity === level} onPress={() => set('intensity', level)} />
        ))}
      </View>

      <Text style={styles.label}>Notas (opcional)</Text>
      <TextInput style={styles.input} value={form.notes} onChangeText={value => set('notes', value)} accessibilityLabel="Notas" multiline maxLength={500} />

      {(!editing || !editing.isSeries || scope === 'series') && (
        <>
          <View style={styles.switchRow}>
            <Text style={styles.label}>Se repite cada semana</Text>
            <Switch value={form.repeats} onValueChange={value => set('repeats', value)} accessibilityLabel="Se repite cada semana" />
          </View>
          {form.repeats && (
            <>
              <View style={styles.row}>
                {WEEKDAY_SHORT.map((name, day) => (
                  <Chip key={name} label={name} selected={form.repeatDays.includes(day)} onPress={() => toggleDay(day)} />
                ))}
              </View>
              {errors.repeatDays && <Text style={styles.error}>{errors.repeatDays}</Text>}
              <Text style={styles.label}>Hasta (AAAA-MM-DD, vacío = sin fecha final)</Text>
              <TextInput style={styles.input} value={form.until} onChangeText={value => set('until', value)} accessibilityLabel="Hasta" autoCapitalize="none" />
              {errors.until && <Text style={styles.error}>{errors.until}</Text>}
              {summary !== '' && <Text style={styles.hint}>{summary}</Text>}
            </>
          )}
        </>
      )}

      {editing?.isSeries && (
        <>
          <Text style={styles.label}>Aplicar a</Text>
          <View style={styles.row}>
            <Chip label="Solo este día" selected={scope === 'occurrence'} onPress={() => setScope('occurrence')} />
            <Chip label="Toda la serie" selected={scope === 'series'} onPress={() => setScope('series')} />
          </View>
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={[styles.primary, saving && styles.disabled]} onPress={submit} disabled={saving} accessibilityRole="button" accessibilityLabel="Guardar">
        <Text style={styles.primaryText}>{saving ? 'Guardando…' : 'Guardar'}</Text>
      </TouchableOpacity>
      {editing && onDelete && (
        <TouchableOpacity style={styles.danger} onPress={() => onDelete(editing.isSeries ? scope : 'series')} disabled={saving} accessibilityRole="button" accessibilityLabel="Eliminar">
          <Text style={styles.dangerText}>{wholeSeriesOnly ? 'Eliminar solo este día' : editing.isSeries ? 'Eliminar toda la serie' : 'Eliminar'}</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.secondary} onPress={onCancel} accessibilityRole="button" accessibilityLabel="Cancelar">
        <Text style={styles.secondaryText}>Cancelar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// Estilos mínimos y provisionales; texto de 11 px o más.
const styles = StyleSheet.create({
  content: { padding: 16, gap: 8 },
  title: { fontSize: 20, fontWeight: '800', color: colors.ink },
  hint: { fontSize: 13, color: colors.inkSecondary },
  label: { fontSize: 14, fontWeight: '700', color: colors.ink, marginTop: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  input: { minHeight: 44, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, color: colors.ink, backgroundColor: viewColors.surfaceMuted },
  locked: { color: colors.inkSecondary, opacity: 0.7 },
  chip: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: viewColors.surfaceMuted, borderWidth: 2, borderColor: 'transparent' },
  chipOn: { backgroundColor: colors.blueTint, borderColor: colors.blue },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.ink },
  chipTextOn: { color: colors.blue },
  beads: { flexDirection: 'row', gap: 3 },
  bead: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.grayBorder },
  beadOn: { backgroundColor: colors.ink },
  beadOnSelected: { backgroundColor: colors.blue },
  error: { fontSize: 13, color: viewColors.danger },
  primary: { minHeight: 52, borderRadius: 999, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  primaryText: { color: colors.onBlue, fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  danger: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  dangerText: { color: viewColors.danger, fontSize: 15, fontWeight: '600' },
  secondary: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.inkSecondary, fontSize: 15 },
});
