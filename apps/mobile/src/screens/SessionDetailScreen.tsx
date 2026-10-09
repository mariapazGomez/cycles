import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from '../components/PressableScale';
import { Spinner } from '../components/Spinner';
import { reopenSession, submitFeedback } from '../services/executionApi';
import { fetchSessionDetail, type SessionDetail } from '../services/planApi';
import type { AppStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { cardShadow, primaryShadow } from '../theme/elevation';
import { formatDay, sessionDay } from '../utils/planCalendar';
import { REASONS, buildNotes, effortLabel } from '../utils/sessionResult';

type Props = NativeStackScreenProps<AppStackParamList, 'SessionDetail'>;
type Step = 'choose' | 'done' | 'skipped';

const SRPE_SCALE = Array.from({ length: 11 }, (_, i) => i);

const STATUS_LABEL = { completed: 'Hecha', skipped: 'No hecha', pending: 'Pendiente' } as const;
const STATUS_OPTIONS: Array<{ value: keyof typeof STATUS_LABEL; hint: string }> = [
  { value: 'completed', hint: 'La hiciste. Te pedimos el esfuerzo y los minutos.' },
  { value: 'skipped', hint: 'No la hiciste. Puedes contar el motivo.' },
  { value: 'pending', hint: 'La vuelves a dejar por hacer, sin las series que registraste.' },
];

export function SessionDetailScreen({ route }: Props) {
  const { sessionId } = route.params;
  const insets = useSafeAreaInsets();
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step | null>(null);
  const [srpe, setSrpe] = useState<number | null>(null);
  const [minutes, setMinutes] = useState(45);
  const [reason, setReason] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setDetail(await fetchSessionDetail(sessionId));
    } catch {
      setError('No pudimos cargar la sesión. Intenta de nuevo.');
    }
  }, [sessionId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const closeSheet = () => {
    if (!saving) {
      setStep(null);
    }
  };

  const openChoose = () => {
    setSheetError(null);
    setSrpe(null);
    setReason(null);
    setNotes('');
    setStep('choose');
  };

  const run = async (action: () => Promise<unknown>) => {
    setSaving(true);
    setSheetError(null);
    try {
      await action();
      setStep(null);
      await load();
    } catch (err) {
      setSheetError(err instanceof Error ? err.message : 'No pudimos guardar el cambio.');
    } finally {
      setSaving(false);
    }
  };

  const choose = (value: keyof typeof STATUS_LABEL) => {
    if (!detail || value === detail.status) {
      return;
    }
    if (value === 'completed') {
      setStep('done');
    } else if (value === 'skipped') {
      setStep('skipped');
    } else {
      Alert.alert(
        'Volver a pendiente',
        'Se anulan el cierre y las series que registraste en esta sesión (quedan guardados en tu historial) y la sesión vuelve a empezar de cero.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Volver a pendiente', onPress: () => run(() => reopenSession(sessionId)) },
        ],
      );
    }
  };

  const current = detail?.feedback[0];

  const saveDone = () => {
    if (srpe === null) {
      setSheetError('Indica qué tan dura fue la sesión.');
      return;
    }
    run(() =>
      submitFeedback(sessionId, {
        outcome: 'completed',
        srpe,
        durationMinutes: minutes,
        notes: notes.trim() === '' ? undefined : notes.trim(),
        // Si ya tenía un cierre vigente (p. ej. "no hecha"), este lo corrige.
        supersedesId: current?.id,
      }),
    );
  };

  const saveSkipped = () =>
    run(() =>
      submitFeedback(sessionId, {
        outcome: 'skipped',
        notes: buildNotes({ result: 'skipped', doneSets: 0, plannedSets: 0, reason, notes }),
        supersedesId: current?.id,
      }),
    );

  if (!detail) {
    return (
      <View style={styles.centered}>
        {error ? <Text style={styles.error}>{error}</Text> : <Spinner size={44} />}
      </View>
    );
  }

  const day = sessionDay(detail);
  const status = detail.status;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.title}>{detail.name}</Text>

        <View style={styles.pills}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{`Semana ${detail.weekNumber}`}</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{`Sesión ${detail.slotNumber}`}</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{day ? formatDay(day) : 'Sin día asignado'}</Text>
          </View>
        </View>

        <View style={[styles.card, styles.statusCard]}>
          <View style={styles.flex}>
            <Text style={styles.cardLabel}>Estado</Text>
            <View
              style={[
                styles.statusPill,
                status === 'completed' && styles.statusDone,
                status === 'skipped' && styles.statusWarn,
              ]}>
              <Text
                style={[
                  styles.statusText,
                  status === 'completed' && { color: colors.okInk },
                  status === 'skipped' && { color: colors.warnInk },
                ]}>
                {STATUS_LABEL[status]}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={openChoose} hitSlop={10} accessibilityLabel="Cambiar estado">
            <Text style={styles.link}>Cambiar estado</Text>
          </TouchableOpacity>
        </View>

        {current && status !== 'pending' && (
          <View style={styles.card}>
            {current.outcome === 'completed' && current.srpe !== null && (
              <View style={styles.stats}>
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>{current.srpe}</Text>
                  <Text style={styles.statLabel}>{`Esfuerzo, ${effortLabel(current.srpe).toLowerCase()}`}</Text>
                </View>
                {current.durationMinutes !== null && (
                  <View style={styles.stat}>
                    <Text style={styles.statNumber}>{current.durationMinutes}</Text>
                    <Text style={styles.statLabel}>minutos</Text>
                  </View>
                )}
              </View>
            )}
            {current.pain && (
              <Text style={styles.painText}>
                {current.painNotes ? `Dolor: ${current.painNotes}` : 'Reportaste dolor.'}
              </Text>
            )}
            {current.notes ? <Text style={styles.notesText}>{current.notes}</Text> : null}
            {current.outcome === 'skipped' && !current.notes ? (
              <Text style={styles.notesText}>Sin motivo registrado.</Text>
            ) : null}
          </View>
        )}

        <Text style={styles.sectionTitle}>Ejercicios</Text>
        {detail.sessionExercises.length === 0 && (
          <View style={styles.card}>
            <Text style={styles.notesText}>Tu coach aún no agregó ejercicios a esta sesión.</Text>
          </View>
        )}
        {detail.sessionExercises.map((item, index) => {
          const logs = [...item.logs].sort((a, b) => a.setNumber - b.setNumber);
          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.exerciseHead}>
                <View style={styles.exerciseNode}>
                  <Text style={styles.exerciseNodeText}>{index + 1}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.exerciseName}>{item.exercise.name}</Text>
                  <Text style={styles.exerciseTarget}>
                    {`${item.targetSets} × ${item.targetReps}${item.targetWeight ? ` · ${item.targetWeight} kg` : ''}`}
                  </Text>
                </View>
                <Text style={styles.exerciseCount}>{`${logs.length}/${item.targetSets}`}</Text>
              </View>
              {logs.length > 0 ? (
                <View style={styles.sets}>
                  {logs.map(log => (
                    <View key={log.id} style={styles.setChip}>
                      <Text style={styles.setChipText}>
                        {log.actualWeight != null ? `${log.actualReps} × ${log.actualWeight} kg` : `${log.actualReps} reps`}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noLogs}>Sin series registradas</Text>
              )}
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={step !== null} transparent animationType="slide" onRequestClose={closeSheet}>
        <Pressable style={styles.backdrop} onPress={closeSheet} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.grabber} />

            {step === 'choose' && (
              <>
                <Text style={styles.sheetTitle}>Cambiar estado</Text>
                {STATUS_OPTIONS.map(option => {
                  const on = status === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.option, on && styles.optionOn]}
                      onPress={() => choose(option.value)}
                      disabled={saving}>
                      <View style={[styles.radio, on && styles.radioOn]}>{on && <View style={styles.radioDot} />}</View>
                      <View style={styles.flex}>
                        <Text style={styles.optionTitle}>{STATUS_LABEL[option.value]}</Text>
                        <Text style={styles.optionHint}>{option.hint}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                <Text style={styles.footnote}>Siguiente se marca solo: es la primera sesión pendiente de tu plan.</Text>
              </>
            )}

            {step === 'done' && (
              <>
                <Text style={styles.sheetTitle}>Marcar como hecha</Text>
                <Text style={styles.formLabel}>¿Qué tan dura fue?</Text>
                <View style={styles.scaleRow}>
                  {SRPE_SCALE.map(value => {
                    const on = srpe === value;
                    return (
                      <TouchableOpacity
                        key={value}
                        style={[styles.scaleItem, on && styles.scaleItemOn]}
                        onPress={() => setSrpe(value)}
                        accessibilityLabel={`Esfuerzo ${value}`}>
                        <Text style={[styles.scaleText, on && styles.scaleTextOn]}>{value}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.scaleHint}>{srpe === null ? '0 Nada, 10 Máxima' : effortLabel(srpe)}</Text>

                <Text style={styles.formLabel}>Minutos que duró</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity style={styles.stepButton} onPress={() => setMinutes(m => Math.max(1, m - 5))} accessibilityLabel="Menos minutos">
                    <Text style={styles.stepButtonText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepValue}>{minutes}</Text>
                  <TouchableOpacity style={styles.stepButton} onPress={() => setMinutes(m => Math.min(600, m + 5))} accessibilityLabel="Más minutos">
                    <Text style={styles.stepButtonText}>+</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Notas para tu coach (opcional)"
                  placeholderTextColor={colors.grayMid}
                  multiline
                  value={notes}
                  onChangeText={setNotes}
                />
                {sheetError && <Text style={styles.error}>{sheetError}</Text>}
                <PressableScale style={[styles.submit, saving && styles.disabled]} onPress={saveDone} disabled={saving}>
                  {saving ? <Spinner size={22} color={colors.onBlue} /> : <Text style={styles.submitText}>Guardar como hecha</Text>}
                </PressableScale>
              </>
            )}

            {step === 'skipped' && (
              <>
                <Text style={styles.sheetTitle}>Marcar como no hecha</Text>
                <Text style={styles.formLabel}>¿Por qué no la hiciste?</Text>
                <View style={styles.chips}>
                  {REASONS.map(item => {
                    const on = reason === item;
                    return (
                      <TouchableOpacity
                        key={item}
                        style={[styles.chip, on && styles.chipOn]}
                        onPress={() => setReason(on ? null : item)}>
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>{item}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Cuéntale a tu coach qué pasó (opcional)"
                  placeholderTextColor={colors.grayMid}
                  multiline
                  value={notes}
                  onChangeText={setNotes}
                />
                {sheetError && <Text style={styles.error}>{sheetError}</Text>}
                <PressableScale style={[styles.submit, saving && styles.disabled]} onPress={saveSkipped} disabled={saving}>
                  {saving ? <Spinner size={22} color={colors.onBlue} /> : <Text style={styles.submitText}>Guardar como no hecha</Text>}
                </PressableScale>
              </>
            )}

            {step === 'choose' && sheetError && <Text style={styles.error}>{sheetError}</Text>}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgApp },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgApp, padding: 24 },
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink, marginBottom: 10 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  pill: { backgroundColor: colors.blueTint, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12 },
  pillText: { fontSize: 12, fontWeight: '700', color: colors.blue },
  card: { backgroundColor: colors.bg, borderRadius: 18, padding: 14, marginBottom: 10, ...cardShadow },
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardLabel: { fontSize: 12, color: colors.inkSecondary, marginBottom: 6 },
  statusPill: { alignSelf: 'flex-start', backgroundColor: colors.bgApp, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12 },
  statusDone: { backgroundColor: colors.okBg },
  statusWarn: { backgroundColor: colors.warnBg },
  statusText: { fontSize: 13, fontWeight: '700', color: colors.inkSecondary },
  link: { color: colors.blue, fontSize: 14, fontWeight: '600' },
  stats: { flexDirection: 'row', gap: 24, marginBottom: 8 },
  stat: {},
  statNumber: { fontSize: 30, lineHeight: 32, fontWeight: '800', color: colors.ink },
  statLabel: { fontSize: 12, color: colors.inkSecondary, marginTop: 2 },
  painText: { color: colors.painInk, fontSize: 13, marginBottom: 6 },
  notesText: { fontSize: 14, color: colors.inkSecondary },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, marginTop: 6, marginBottom: 10 },
  exerciseHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  exerciseNode: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.bgApp, alignItems: 'center', justifyContent: 'center' },
  exerciseNodeText: { fontSize: 12, fontWeight: '700', color: colors.inkSecondary },
  exerciseName: { fontSize: 16, fontWeight: '600', color: colors.ink },
  exerciseTarget: { fontSize: 13, color: colors.inkSecondary, marginTop: 2 },
  exerciseCount: { fontSize: 13, fontWeight: '700', color: colors.inkSecondary },
  sets: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  setChip: { backgroundColor: colors.okBg, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  setChipText: { fontSize: 12, fontWeight: '600', color: colors.okInk },
  noLogs: { fontSize: 12, color: colors.grayMid, marginTop: 8 },
  error: { color: colors.painInk, fontSize: 13, marginVertical: 8 },
  backdrop: { flex: 1, backgroundColor: 'rgba(31,34,40,0.35)' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 16, paddingTop: 10 },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.grayDot, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: colors.ink, marginBottom: 12 },
  option: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 16, backgroundColor: colors.bgApp, marginBottom: 8 },
  optionOn: { backgroundColor: colors.blueTint, borderWidth: 2, borderColor: colors.blue, padding: 10 },
  optionTitle: { fontSize: 15, fontWeight: '600', color: colors.ink },
  optionHint: { fontSize: 12, color: colors.inkSecondary, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.controlBorder, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  radioOn: { borderColor: colors.blue, backgroundColor: colors.blue },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.onBlue },
  footnote: { fontSize: 12, color: colors.inkSecondary, marginTop: 4, textAlign: 'center' },
  formLabel: { fontSize: 13, fontWeight: '600', color: colors.inkSecondary, marginBottom: 8, marginTop: 4 },
  scaleRow: { flexDirection: 'row', gap: 4 },
  scaleItem: { flex: 1, height: 40, borderRadius: 10, backgroundColor: colors.bgApp, alignItems: 'center', justifyContent: 'center' },
  scaleItemOn: { backgroundColor: colors.blue },
  scaleText: { fontSize: 13, fontWeight: '700', color: colors.inkSecondary },
  scaleTextOn: { color: colors.onBlue },
  scaleHint: { fontSize: 12, color: colors.inkSecondary, marginTop: 6, marginBottom: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.blueTint, alignItems: 'center', justifyContent: 'center' },
  stepButtonText: { fontSize: 26, fontWeight: '600', color: colors.blue },
  stepValue: { flex: 1, textAlign: 'center', fontSize: 36, fontWeight: '800', color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: { backgroundColor: colors.bgApp, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  chipOn: { backgroundColor: colors.blueTint, borderWidth: 2, borderColor: colors.blue, paddingVertical: 6, paddingHorizontal: 12 },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.inkSecondary },
  chipTextOn: { color: colors.blue },
  input: {
    borderWidth: 1,
    borderColor: colors.controlBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 48,
    color: colors.ink,
    textAlignVertical: 'top',
    marginBottom: 6,
  },
  submit: { backgroundColor: colors.blue, borderRadius: 999, paddingVertical: 16, alignItems: 'center', marginTop: 8, ...primaryShadow },
  submitText: { color: colors.onBlue, fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
