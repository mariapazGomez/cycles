import React, { useRef, useState } from 'react';
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
import { submitFeedback } from '../services/executionApi';
import type { AppStackParamList } from '../navigation/types';
import { BeadChain } from '../components/BeadChain';
import { Icon } from '../components/Icon';
import { PressableScale } from '../components/PressableScale';
import { Spinner } from '../components/Spinner';
import { colors } from '../theme/colors';
import { cardShadow, primaryShadow } from '../theme/elevation';
import {
  REASONS,
  buildNotes,
  deduceResult,
  effortLabel,
  type SessionResult,
} from '../utils/sessionResult';

type Props = NativeStackScreenProps<AppStackParamList, 'SessionFeedback'>;

const SRPE_SCALE = Array.from({ length: 11 }, (_, i) => i);

const RESULT_OPTIONS: Array<{ value: SessionResult; title: string; hint: string }> = [
  { value: 'completed', title: 'Terminé todo', hint: 'Hice todas las series que tenía planeadas.' },
  { value: 'partial', title: 'Terminé una parte', hint: 'Hice algunas series y paré antes de acabar.' },
  { value: 'skipped', title: 'No pude entrenar', hint: 'No hice ninguna serie hoy.' },
];

export function SessionFeedbackScreen({ route, navigation }: Props) {
  const { sessionId, doneSets, plannedSets, doneExercises, totalExercises } = route.params;
  const insets = useSafeAreaInsets();
  const [result, setResult] = useState<SessionResult>(() => deduceResult(doneSets, plannedSets));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [srpe, setSrpe] = useState<number | null>(null);
  const [reason, setReason] = useState<string | null>(null);
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

  const trained = result !== 'skipped';

  const summary = {
    completed: { icon: 'check' as const, bg: colors.okBg, fg: colors.okInk, title: `Hiciste las ${plannedSets} series` },
    partial: { icon: 'alert' as const, bg: colors.warnBg, fg: colors.warnInk, title: `Hiciste ${doneSets} de ${plannedSets} series` },
    skipped: { icon: 'close' as const, bg: colors.warnBg, fg: colors.warnInk, title: 'No hiciste ninguna serie' },
  }[result];

  const chooseResult = (value: SessionResult) => {
    if (value === 'skipped' && doneSets > 0) {
      Alert.alert(
        'Ya tienes series registradas',
        `Tienes ${doneSets} series guardadas hoy. ¿Seguro que no pudiste entrenar?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Sí, no pude', style: 'destructive', onPress: () => setResult(value) },
        ],
      );
      return;
    }
    setResult(value);
  };

  const handleSubmit = async () => {
    if (submittingRef.current) {
      return;
    }
    if (trained && srpe === null) {
      setError('Indica qué tan dura fue la sesión.');
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await submitFeedback(sessionId, {
        // El backend admite completed y skipped: una sesión parcial se envía
        // como completed y la parcialidad queda en la nota.
        outcome: trained ? 'completed' : 'skipped',
        srpe: trained ? srpe ?? undefined : undefined,
        pain: trained ? pain : false,
        painNotes: trained && pain && painNotes.trim() !== '' ? painNotes : undefined,
        notes: buildNotes({ result, doneSets, plannedSets, reason, notes }),
      });
      navigation.goBack();
    } catch (err) {
      submittingRef.current = false;
      setError(err instanceof Error ? err.message : 'No pudimos cerrar la sesión.');
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Cerrar sesión</Text>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} accessibilityLabel="Cerrar">
              <Icon name="close" size={26} color={colors.inkSecondary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.card, styles.resultRow]}>
            <View style={[styles.resultIcon, { backgroundColor: summary.bg }]}>
              <Icon name={summary.icon} size={20} color={summary.fg} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.resultTitle}>{summary.title}</Text>
              <Text style={styles.resultHint}>
                {doneExercises} de {totalExercises} ejercicios
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSheetOpen(true)} hitSlop={10}>
              <Text style={styles.link}>Cambiar</Text>
            </TouchableOpacity>
          </View>

          {result !== 'completed' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {result === 'partial' ? '¿Qué pasó con el resto?' : '¿Por qué no pudiste entrenar?'}
              </Text>
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
            </View>
          )}

          {trained && (
            <View style={styles.hero}>
              <BeadChain />
              <Text style={styles.heroLabel}>¿Qué tan dura fue?</Text>
              <View style={styles.heroValue}>
                <Text style={styles.heroNumber}>{srpe ?? '–'}</Text>
                <Text style={styles.heroWord}>{srpe === null ? 'Elige' : effortLabel(srpe)}</Text>
              </View>
              <View style={styles.beads}>
                {SRPE_SCALE.map(value => {
                  const selected = srpe === value;
                  const filled = srpe !== null && value < srpe;
                  const size = selected ? 28 : 14 + value * 1.2;
                  return (
                    <Pressable
                      key={value}
                      style={styles.beadHit}
                      onPress={() => setSrpe(value)}
                      accessibilityLabel={`Esfuerzo ${value}`}>
                      <View
                        style={[
                          styles.bead,
                          {
                            width: size,
                            height: size,
                            borderRadius: size / 2,
                            backgroundColor: selected ? colors.onBlue : filled ? colors.brand : colors.inkTrack,
                            opacity: filled ? 0.35 + value * 0.065 : 1,
                          },
                          selected && styles.beadSelected,
                        ]}
                      />
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.scaleEnds}>
                <Text style={styles.scaleEnd}>0 Nada</Text>
                <Text style={styles.scaleEnd}>10 Máxima</Text>
              </View>
            </View>
          )}

          {trained && (
            <View style={[styles.card, pain && styles.cardPain]}>
              <View style={styles.painRow}>
                {pain && <Icon name="alert" size={22} color={colors.painInk} />}
                <Text style={[styles.cardTitle, styles.flex, pain && { color: colors.painInk }]}>
                  {pain ? 'Sentí dolor' : '¿Sentiste dolor?'}
                </Text>
                <View style={styles.toggle}>
                  <TouchableOpacity style={[styles.toggleItem, !pain && styles.toggleOn]} onPress={() => setPain(false)}>
                    <Text style={[styles.toggleText, !pain && styles.toggleTextOn]}>No</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.toggleItem, pain && styles.togglePain]} onPress={() => setPain(true)}>
                    <Text style={[styles.toggleText, pain && { color: colors.painInk }]}>Sí</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {pain && (
                <TextInput
                  style={[styles.input, styles.painInput]}
                  placeholder="¿Dónde y cómo fue el dolor?"
                  placeholderTextColor={colors.grayMid}
                  multiline
                  value={painNotes}
                  onChangeText={setPainNotes}
                />
              )}
            </View>
          )}

          <View style={styles.card}>
            <TextInput
              style={styles.input}
              placeholder={result === 'skipped' ? 'Cuéntale a tu coach qué pasó' : 'Notas para tu coach (opcional)'}
              placeholderTextColor={colors.grayMid}
              multiline
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          {error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
          <PressableScale
            style={[styles.submit, submitting && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={submitting}>
            {submitting ? <Spinner size={22} color={colors.onBlue} /> : <Text style={styles.submitText}>Enviar</Text>}
          </PressableScale>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSheetOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.grabber} />
          <Text style={styles.sheetTitle}>¿Cómo fue tu sesión?</Text>
          {RESULT_OPTIONS.map(option => {
            const on = result === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.option, on && styles.optionOn]}
                onPress={() => chooseResult(option.value)}>
                <View style={[styles.radio, on && styles.radioOn]}>{on && <View style={styles.radioDot} />}</View>
                <View style={styles.flex}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionHint}>{option.hint}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          <PressableScale style={[styles.submit, styles.sheetButton]} onPress={() => setSheetOpen(false)}>
            <Text style={styles.submitText}>Listo</Text>
          </PressableScale>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgApp },
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 30, fontWeight: '800', color: colors.ink },
  card: { backgroundColor: colors.bg, borderRadius: 18, padding: 14, marginBottom: 10, ...cardShadow },
  cardPain: { backgroundColor: colors.painBg, borderWidth: 1, borderColor: '#f3b9b9' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.ink },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  resultTitle: { fontSize: 15, fontWeight: '600', color: colors.ink },
  resultHint: { fontSize: 12, color: colors.inkSecondary },
  link: { color: colors.blue, fontSize: 14, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: { backgroundColor: colors.bgApp, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  chipOn: { backgroundColor: colors.blueTint, borderWidth: 2, borderColor: colors.blue, paddingVertical: 6, paddingHorizontal: 12 },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.inkSecondary },
  chipTextOn: { color: colors.blue },
  hero: { backgroundColor: colors.ink, borderRadius: 22, padding: 16, marginBottom: 10, overflow: 'hidden' },
  heroLabel: { fontSize: 12, color: colors.inkMuted },
  heroValue: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  heroNumber: { fontSize: 64, lineHeight: 68, fontWeight: '800', color: colors.onBlue },
  heroWord: { fontSize: 22, fontWeight: '800', color: colors.onBlue, marginBottom: 10 },
  beads: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  beadHit: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  bead: {},
  beadSelected: { borderWidth: 3, borderColor: colors.brand },
  scaleEnds: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleEnd: { fontSize: 11, color: colors.inkMuted },
  painRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggle: { flexDirection: 'row', gap: 6, width: 132 },
  toggleItem: { flex: 1, height: 40, borderRadius: 12, backgroundColor: colors.bgApp, alignItems: 'center', justifyContent: 'center' },
  toggleOn: { backgroundColor: colors.blueTint, borderWidth: 2, borderColor: colors.blue },
  togglePain: { backgroundColor: colors.bg, borderWidth: 2, borderColor: colors.painInk },
  toggleText: { fontWeight: '600', color: colors.inkSecondary },
  toggleTextOn: { color: colors.blue },
  input: {
    borderWidth: 1,
    borderColor: colors.controlBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 48,
    color: colors.ink,
    backgroundColor: colors.bg,
    textAlignVertical: 'top',
  },
  painInput: { marginTop: 10, borderColor: '#e3a3a3' },
  error: { color: colors.painInk, fontSize: 13, marginBottom: 8, paddingHorizontal: 4 },
  footer: { paddingHorizontal: 16, paddingTop: 8, backgroundColor: colors.bgApp },
  submit: {
    backgroundColor: colors.blue,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    ...primaryShadow,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: colors.onBlue, fontSize: 16, fontWeight: '700' },
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
  sheetButton: { marginTop: 8 },
});
