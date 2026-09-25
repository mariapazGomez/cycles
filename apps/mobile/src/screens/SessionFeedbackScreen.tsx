import React, { useRef, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { SessionOutcome } from '@cycles/shared';
import { submitFeedback } from '../services/executionApi';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'SessionFeedback'>;

const SRPE_SCALE = Array.from({ length: 11 }, (_, i) => i);

export function SessionFeedbackScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const [outcome, setOutcome] = useState<SessionOutcome>('completed');
  const [srpe, setSrpe] = useState<number | null>(null);
  const [pain, setPain] = useState(false);
  const [painNotes, setPainNotes] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guarda sincrónica contra doble-tap: `submitting` (estado) recién se
  // refleja en el próximo render, así que un segundo toque en el mismo
  // frame podría colarse antes de que el botón se deshabilite. A
  // diferencia de logSet, el feedback no tiene id de idempotencia en el
  // backend, así que un envío duplicado real generaría un 409.
  const submittingRef = useRef(false);

  const handleSubmit = async () => {
    if (submittingRef.current) {
      return;
    }
    if (outcome === 'completed' && srpe === null) {
      setError('Indica qué tan dura fue la sesión.');
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await submitFeedback(sessionId, {
        outcome,
        srpe: outcome === 'completed' ? srpe ?? undefined : undefined,
        pain,
        painNotes: pain ? painNotes : undefined,
        notes: notes.trim() === '' ? undefined : notes,
      });
      navigation.goBack();
    } catch (err) {
      submittingRef.current = false;
      setError(err instanceof Error ? err.message : 'No pudimos cerrar la sesión.');
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Cerrar sesión</Text>

      <Text style={styles.sectionLabel}>¿Cómo te fue?</Text>
      <View style={styles.outcomeRow}>
        {(['completed', 'skipped'] as SessionOutcome[]).map(value => (
          <TouchableOpacity
            key={value}
            style={[styles.outcomeOption, outcome === value && styles.outcomeOptionSelected]}
            onPress={() => setOutcome(value)}>
            <Text
              style={[
                styles.outcomeOptionText,
                outcome === value && styles.outcomeOptionTextSelected,
              ]}>
              {value === 'completed' ? 'La completé' : 'No la hice'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {outcome === 'completed' && (
        <>
          <Text style={styles.sectionLabel}>¿Qué tan dura fue? (0 = nada, 10 = máxima)</Text>
          <View style={styles.srpeRow}>
            {SRPE_SCALE.map(value => (
              <TouchableOpacity
                key={value}
                style={[styles.srpeOption, srpe === value && styles.srpeOptionSelected]}
                onPress={() => setSrpe(value)}>
                <Text
                  style={[
                    styles.srpeOptionText,
                    srpe === value && styles.srpeOptionTextSelected,
                  ]}>
                  {value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <View style={styles.painRow}>
        <Text style={styles.sectionLabel}>¿Sentiste dolor?</Text>
        <Switch value={pain} onValueChange={setPain} />
      </View>

      {pain && (
        <TextInput
          style={styles.textArea}
          placeholder="¿Dónde y cómo fue el dolor?"
          placeholderTextColor="#8e8e93"
          multiline
          value={painNotes}
          onChangeText={setPainNotes}
        />
      )}

      <Text style={styles.sectionLabel}>Notas (opcional)</Text>
      <TextInput
        style={styles.textArea}
        placeholder={outcome === 'skipped' ? 'Motivo por el que no la hiciste' : 'Algo que quieras contarle a tu coach'}
        placeholderTextColor="#8e8e93"
        multiline
        value={notes}
        onChangeText={setNotes}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.submitButtonText}>Enviar</Text>
        )}
      </TouchableOpacity>
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
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2228',
    marginBottom: 10,
  },
  outcomeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  outcomeOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d8d8dc',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  outcomeOptionSelected: {
    backgroundColor: '#0066ee',
    borderColor: '#0066ee',
  },
  outcomeOptionText: {
    fontSize: 15,
    color: '#1f2228',
    fontWeight: '600',
  },
  outcomeOptionTextSelected: {
    color: '#ffffff',
  },
  srpeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  srpeOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d8d8dc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  srpeOptionSelected: {
    backgroundColor: '#0066ee',
    borderColor: '#0066ee',
  },
  srpeOptionText: {
    fontSize: 15,
    color: '#1f2228',
    fontWeight: '600',
  },
  srpeOptionTextSelected: {
    color: '#ffffff',
  },
  painRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#d8d8dc',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1f2228',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  error: {
    color: '#d0342c',
    marginBottom: 12,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#1f2228',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
