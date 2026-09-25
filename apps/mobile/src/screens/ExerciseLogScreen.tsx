import React, { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { ExerciseLog } from '@cycles/shared';
import { logSet } from '../services/executionApi';
import { generateId } from '../utils/uuid';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'ExerciseLog'>;

interface SetRowState {
  actualReps: string;
  actualWeight: string;
  rir: string;
  saved: ExerciseLog | null;
  editing: boolean;
  saving: boolean;
  error: string | null;
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
      actualWeight: existing?.actualWeight !== undefined
        ? String(existing.actualWeight)
        : targetWeight !== undefined
          ? String(targetWeight)
          : '',
      rir: existing?.rir !== undefined ? String(existing.rir) : '',
      saved: existing,
      editing: false,
      saving: false,
      error: null,
    };
  });
}

export function ExerciseLogScreen({ route }: Props) {
  const { sessionExercise } = route.params;
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
    const setNumber = index + 1;
    const reps = Number(row.actualReps);
    if (!Number.isFinite(reps) || reps < 0) {
      updateRow(index, { error: 'Ingresa un número de repeticiones válido.' });
      return;
    }
    const weight = row.actualWeight.trim() === '' ? undefined : Number(row.actualWeight);
    const rir = row.rir.trim() === '' ? undefined : Number(row.rir);

    updateRow(index, { saving: true, error: null });
    try {
      const saved = await logSet(sessionExercise.id, {
        id: row.saved && row.editing ? generateId() : (row.saved?.id ?? generateId()),
        setNumber,
        actualReps: reps,
        actualWeight: weight,
        rir,
        supersedesId: row.editing ? row.saved?.id : undefined,
      });
      updateRow(index, { saved: saved as ExerciseLog, editing: false, saving: false });
    } catch (err) {
      updateRow(index, {
        saving: false,
        error: err instanceof Error ? err.message : 'No pudimos guardar la serie.',
      });
    }
  };

  const isLastSet = (index: number) => index === rows.length - 1;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{sessionExercise.exercise.name}</Text>
      <Text style={styles.subtitle}>
        {sessionExercise.targetSets} series × {sessionExercise.targetReps} reps
        {sessionExercise.targetWeight ? ` · ${sessionExercise.targetWeight} kg` : ''}
      </Text>

      {rows.map((row, index) => {
        const locked = row.saved !== null && !row.editing;
        return (
          <View key={index} style={styles.setCard}>
            <View style={styles.setHeader}>
              <Text style={styles.setLabel}>Serie {index + 1}</Text>
              {locked && (
                <TouchableOpacity onPress={() => updateRow(index, { editing: true })}>
                  <Text style={styles.editLink}>Editar</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.fieldsRow}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Reps</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  editable={!locked}
                  value={row.actualReps}
                  onChangeText={text => updateRow(index, { actualReps: text })}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Peso (kg)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  editable={!locked}
                  value={row.actualWeight}
                  onChangeText={text => updateRow(index, { actualWeight: text })}
                />
              </View>
              {isLastSet(index) && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>RIR</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="number-pad"
                    editable={!locked}
                    placeholder="0-4"
                    value={row.rir}
                    onChangeText={text => updateRow(index, { rir: text })}
                  />
                </View>
              )}
            </View>

            {row.error && <Text style={styles.error}>{row.error}</Text>}

            {!locked && (
              <TouchableOpacity
                style={[styles.saveButton, row.saving && styles.saveButtonDisabled]}
                onPress={() => handleSave(index)}
                disabled={row.saving}>
                {row.saving ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {row.saved ? 'Guardar corrección' : 'Guardar serie'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2228',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b6b70',
    marginBottom: 20,
  },
  setCard: {
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  setHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  setLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2228',
  },
  editLink: {
    color: '#0066ee',
    fontSize: 14,
  },
  fieldsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  field: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#6b6b70',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d8d8dc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1f2228',
  },
  error: {
    color: '#d0342c',
    fontSize: 13,
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#0066ee',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
