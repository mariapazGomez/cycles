import React, { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import type { ExerciseLog } from '@cycles/shared';
import { logSet } from '../services/executionApi';
import { generateId } from '../utils/uuid';
import { RestBar } from '../components/RestTimer';
import { PressableScale } from '../components/PressableScale';
import { cardShadow, primaryShadow } from '../theme/elevation';
import { useRestTimer } from '../store/RestTimerContext';
import type { AppStackParamList } from '../navigation/types';
import { Spinner } from '../components/Spinner';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<AppStackParamList, 'ExerciseLog'>;

interface SetRowState {
  actualReps: string;
  actualWeight: string;
  rir: string;
  saved: ExerciseLog | null;
  editing: boolean;
  saving: boolean;
  error: string | null;
  // Id de idempotencia para el próximo intento de guardado de esta fila.
  // Se genera una sola vez por intento y se reutiliza en los reintentos
  // (ver handleSave): si se regenerara en cada llamada, un reintento tras
  // un fallo de red mandaría un id distinto y el backend lo rechazaría
  // como serie duplicada en vez de devolver el registro ya guardado.
  pendingId: string;
}

function buildInitialRows(
  targetSets: number,
  targetReps: number,
  targetWeight: number | undefined,
  logs: ExerciseLog[],
): SetRowState[] {
  return Array.from({ length: targetSets }, (_, index) => {
    const setNumber = index + 1;
    const existing = logs.find(log => log.setNumber === setNumber) ?? null;
    return {
      actualReps: String(existing?.actualReps ?? targetReps),
      // El backend serializa "sin valor" como null, no como campo ausente:
      // hay que comparar con == null (cubre null y undefined), no
      // !== undefined, o un peso/RIR realmente vacío se muestra como "null".
      actualWeight: existing?.actualWeight != null
        ? String(existing.actualWeight)
        : targetWeight !== undefined
          ? String(targetWeight)
          : '',
      rir: existing?.rir != null ? String(existing.rir) : '',
      saved: existing,
      editing: false,
      saving: false,
      error: null,
      pendingId: generateId(),
    };
  });
}

export function ExerciseLogScreen({ route }: Props) {
  const { sessionExercise } = route.params;
  const { startRest } = useRestTimer();
  const [rows, setRows] = useState<SetRowState[]>(() =>
    buildInitialRows(
      sessionExercise.targetSets,
      sessionExercise.targetReps,
      sessionExercise.targetWeight,
      sessionExercise.logs,
    ),
  );

  const updateRow = (index: number, patch: Partial<SetRowState>) => {
    setRows(prev => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const handleSave = async (index: number) => {
    const row = rows[index];
    if (row.saving) {
      return; // Ya hay un guardado en curso para esta serie.
    }
    const setNumber = index + 1;
    const reps = Number(row.actualReps);
    if (!Number.isFinite(reps) || reps < 0) {
      updateRow(index, { error: 'Ingresa un número de repeticiones válido.' });
      return;
    }
    const weightText = row.actualWeight.trim();
    const weight = weightText === '' ? undefined : Number(weightText);
    if (weight !== undefined && !Number.isFinite(weight)) {
      updateRow(index, { error: 'Ingresa un peso válido.' });
      return;
    }
    const rirText = row.rir.trim();
    const rir = rirText === '' ? undefined : Number(rirText);
    if (rir !== undefined && !Number.isFinite(rir)) {
      updateRow(index, { error: 'Ingresa un RIR válido (0 a 4).' });
      return;
    }

    updateRow(index, { saving: true, error: null });
    try {
      const saved = await logSet(sessionExercise.id, {
        id: row.pendingId,
        setNumber,
        actualReps: reps,
        actualWeight: weight,
        rir,
        supersedesId: row.editing ? (row.saved?.id ?? undefined) : undefined,
      });
      setRows(prev =>
        prev.map((r, i) => {
          if (i === index) {
            return { ...r, saved: saved as ExerciseLog, editing: false, saving: false };
          }
          // La serie siguiente arranca con lo que acabas de registrar.
          if (i === index + 1 && r.saved === null) {
            return { ...r, actualReps: row.actualReps, actualWeight: row.actualWeight };
          }
          return r;
        }),
      );
      Vibration.vibrate(15);
      startRest();
    } catch (err) {
      updateRow(index, {
        saving: false,
        error: err instanceof Error ? err.message : 'No pudimos guardar la serie.',
      });
    }
  };

  const startEditing = (index: number) => {
    // Nuevo intento de corrección: se genera un id fresco, distinto del que
    // ya se usó (y consumió) para el registro original.
    updateRow(index, { editing: true, error: null, pendingId: generateId() });
  };

  const isLastSet = (index: number) => index === rows.length - 1;

  const adjustField = (index: number, field: 'actualReps' | 'actualWeight', delta: number) => {
    const current = Number(rows[index][field].replace(',', '.'));
    const next = Math.max(0, (Number.isFinite(current) ? current : 0) + delta);
    updateRow(index, { [field]: String(Math.round(next * 10) / 10) });
  };

  // La serie activa es la que se está corrigiendo o, si no hay, la primera sin guardar.
  const editingIndex = rows.findIndex(row => row.editing);
  const activeIndex =
    editingIndex !== -1 ? editingIndex : rows.findIndex(row => row.saved === null);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{sessionExercise.exercise.name}</Text>

        <View style={styles.progressRow}>
          {rows.map((row, index) => (
            <View
              key={index}
              style={[
                styles.bead,
                row.saved && index !== activeIndex && styles.beadDone,
                index === activeIndex && styles.beadActive,
              ]}
            />
          ))}
          <Text style={styles.progressText}>
            {activeIndex === -1
              ? 'Todas las series listas'
              : `Serie ${activeIndex + 1} de ${rows.length}`}
          </Text>
        </View>

        {rows.map((row, index) => {
          if (index === activeIndex) {
            return (
              <View key={index} style={[styles.setCard, styles.setCardActive]}>
                <View style={styles.setHeader}>
                  <Text style={styles.setLabel}>Serie {index + 1}</Text>
                  <View style={styles.targetPill}>
                    <Text style={styles.targetPillText}>
                      Meta: {sessionExercise.targetReps}
                      {sessionExercise.targetWeight ? ` × ${sessionExercise.targetWeight} kg` : ' reps'}
                    </Text>
                  </View>
                </View>

                <Stepper
                  label="Repeticiones"
                  value={row.actualReps}
                  keyboardType="number-pad"
                  onChange={text => updateRow(index, { actualReps: text })}
                  onStep={delta => adjustField(index, 'actualReps', delta)}
                  step={1}
                />
                <Stepper
                  label="Peso (kg)"
                  value={row.actualWeight}
                  keyboardType="decimal-pad"
                  onChange={text => updateRow(index, { actualWeight: text })}
                  onStep={delta => adjustField(index, 'actualWeight', delta)}
                  step={2.5}
                />

                {isLastSet(index) && (
                  <>
                    <Text style={styles.fieldLabel}>RIR, repeticiones que te quedaron</Text>
                    <View style={styles.chipRow}>
                      {[0, 1, 2, 3, 4].map(value => {
                        const on = row.rir === String(value);
                        return (
                          <TouchableOpacity
                            key={value}
                            style={[styles.chip, on && styles.chipOn]}
                            onPress={() => updateRow(index, { rir: on ? '' : String(value) })}>
                            <Text style={[styles.chipText, on && styles.chipTextOn]}>
                              {value === 4 ? '4+' : value}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}

                {row.error && <Text style={styles.error}>{row.error}</Text>}
              </View>
            );
          }

          if (row.saved) {
            return (
              <View key={index} style={styles.doneCard}>
                <Text style={styles.doneLabel}>Serie {index + 1}</Text>
                <Text style={styles.doneValue}>
                  {row.saved.actualReps} reps
                  {row.saved.actualWeight != null ? ` · ${row.saved.actualWeight} kg` : ''}
                  {row.saved.rir != null ? ` · RIR ${row.saved.rir}` : ''}
                </Text>
                <TouchableOpacity onPress={() => startEditing(index)}>
                  <Text style={styles.editLink}>Editar</Text>
                </TouchableOpacity>
              </View>
            );
          }

          return (
            <View key={index} style={styles.pendingCard}>
              <Text style={styles.pendingLabel}>Serie {index + 1}</Text>
              <Text style={styles.pendingLabel}>Pendiente</Text>
            </View>
          );
        })}
      </ScrollView>

      {activeIndex !== -1 && (
        <View style={styles.footer}>
          <RestBar />
          <PressableScale
            style={[styles.saveButton, rows[activeIndex].saving && styles.saveButtonDisabled]}
            onPress={() => handleSave(activeIndex)}
            disabled={rows[activeIndex].saving}>
            {rows[activeIndex].saving ? (
              <Spinner size={22} color={colors.onBlue} />
            ) : (
              <Text style={styles.saveButtonText}>
                {rows[activeIndex].saved ? 'Guardar corrección' : 'Guardar serie'}
              </Text>
            )}
          </PressableScale>
        </View>
      )}
    </View>
  );
}

interface StepperProps {
  label: string;
  value: string;
  step: number;
  keyboardType: 'number-pad' | 'decimal-pad';
  onChange: (text: string) => void;
  onStep: (delta: number) => void;
}

function Stepper({ label, value, step, keyboardType, onChange, onStep }: StepperProps) {
  return (
    <View style={styles.stepperBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.stepper}>
        <TouchableOpacity
          style={styles.stepButton}
          onPress={() => onStep(-step)}
          accessibilityLabel={`Menos ${label}`}>
          <Text style={styles.stepButtonText}>−</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.stepValue}
          keyboardType={keyboardType}
          value={value}
          onChangeText={onChange}
          selectTextOnFocus
          accessibilityLabel={label}
        />
        <TouchableOpacity
          style={styles.stepButton}
          onPress={() => onStep(step)}
          accessibilityLabel={`Más ${label}`}>
          <Text style={styles.stepButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgApp },
  content: { padding: 16, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink, marginBottom: 12 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  bead: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.grayDot },
  beadDone: { backgroundColor: colors.brand },
  beadActive: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.blueTint,
    borderColor: colors.blue,
    borderWidth: 2,
  },
  progressText: { marginLeft: 6, fontSize: 14, fontWeight: '600', color: colors.ink },
  setCard: { backgroundColor: colors.bg, borderRadius: 18, padding: 16, marginBottom: 12, ...cardShadow },
  setCardActive: {},
  setHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  setLabel: { fontSize: 16, fontWeight: '700', color: colors.ink },
  targetPill: {
    backgroundColor: colors.blueTint,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  targetPillText: { color: colors.blue, fontSize: 12, fontWeight: '700' },
  stepperBlock: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.inkSecondary, marginBottom: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.blueTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonText: { fontSize: 28, fontWeight: '600', color: colors.blue },
  stepValue: {
    flex: 1,
    textAlign: 'center',
    fontSize: 52,
    fontWeight: '800',
    color: colors.ink,
    paddingVertical: 0,
  },
  chipRow: { flexDirection: 'row', gap: 6 },
  chip: {
    flex: 1,
    height: 46,
    backgroundColor: colors.bgApp,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.blueTint, borderWidth: 2, borderColor: colors.blue },
  chipText: { fontSize: 16, fontWeight: '600', color: colors.ink },
  chipTextOn: { color: colors.blue },
  doneCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.okBg,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  doneLabel: { color: colors.okInk, fontWeight: '700', fontSize: 13 },
  doneValue: { color: colors.okInk, fontSize: 13, flex: 1, textAlign: 'right', marginHorizontal: 10 },
  editLink: { color: colors.blue, fontSize: 13, fontWeight: '600' },
  pendingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    ...cardShadow,
  },
  pendingLabel: { color: colors.inkSecondary, fontSize: 13 },
  error: { color: colors.painInk, fontSize: 13, marginTop: 4 },
  footer: { padding: 16, paddingTop: 8 },
  saveButton: {
    backgroundColor: colors.blue,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    ...primaryShadow,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: colors.onBlue, fontSize: 16, fontWeight: '700' },
});
