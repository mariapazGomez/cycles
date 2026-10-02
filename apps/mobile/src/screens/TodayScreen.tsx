import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { TodaySession } from '@cycles/shared';
import { fetchToday, startSession } from '../services/executionApi';
import { ApiError } from '../services/httpClient';
import { toLocalDay } from '../utils/planCalendar';
import { RestBar } from '../components/RestTimer';
import { DEFAULT_REST_SECONDS, useRestTimer } from '../store/RestTimerContext';
import type { AppStackParamList, TabParamList } from '../navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from '../components/PressableScale';
import { BeadChain } from '../components/BeadChain';
import { Icon } from '../components/Icon';
import { Spinner } from '../components/Spinner';
import { ChainBackground } from '../components/ChainBackground';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { useTabBarClearance } from '../components/FloatingTabBar';
import { colors } from '../theme/colors';
import { cardShadow } from '../theme/elevation';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Today'>,
  NativeStackScreenProps<AppStackParamList>
>;

export function TodayScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const clearance = useTabBarClearance();
  const [data, setData] = useState<TodaySession | null | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  // Sesión pendiente que el atleta eligió entre las asignadas para hoy; null =
  // la siguiente pendiente del plan.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { routineStarted, setRoutineStarted, autoRest, setAutoRest } = useRestTimer();

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await fetchToday({ date: toLocalDay(new Date()), sessionId: selectedId ?? undefined }));
    } catch (err) {
      if (selectedId && err instanceof ApiError && err.status === 404) {
        // La sesión elegida ya no está pendiente (p. ej. la terminaste): se
        // vuelve a la siguiente del plan.
        setSelectedId(null);
        return;
      }
      setError('No pudimos cargar tu entrenamiento. Desliza para reintentar.');
    }
  }, [selectedId]);

  const sessionStarted = data?.session.startedAt != null;
  useEffect(() => {
    setRoutineStarted(sessionStarted);
  }, [sessionStarted, setRoutineStarted]);

  const handleStart = async () => {
    if (!data || starting) {
      return;
    }
    setStarting(true);
    setError(null);
    try {
      await startSession(data.session.id);
      await load();
    } catch {
      setError('No pudimos iniciar la rutina. Intenta de nuevo.');
    } finally {
      setStarting(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const exercises = data?.session.sessionExercises ?? [];
  const isComplete = (e: (typeof exercises)[number]) => e.logs.length >= e.targetSets;
  const doneCount = exercises.filter(isComplete).length;
  const doneExercises = doneCount;
  const currentIndex = exercises.findIndex(e => !isComplete(e));
  const doneSets = exercises.reduce((sum, e) => sum + Math.min(e.logs.length, e.targetSets), 0);
  const plannedSets = exercises.reduce((sum, e) => sum + e.targetSets, 0);
  const startedAtMs = data?.session.startedAt ? Date.parse(data.session.startedAt) : NaN;
  const elapsedMinutes = Number.isFinite(startedAtMs)
    ? Math.max(1, Math.round((Date.now() - startedAtMs) / 60000))
    : null;
  const openFeedback = () => {
    if (!data) {
      return;
    }
    navigation.navigate('SessionFeedback', {
      sessionId: data.session.id,
      startedAt: data.session.startedAt,
      doneSets,
      plannedSets,
      doneExercises,
      totalExercises: exercises.length,
    });
  };

  if (data === undefined && !error) {
    return (
      <View style={styles.centered}>
        <Spinner size={44} />
      </View>
    );
  }

  const assignedHere = (data?.assignedToday ?? []).some(a => a.id === data?.session.id);
  const otherAssigned = (data?.assignedToday ?? []).filter(a => a.id !== data?.session.id);

  const nextExercise = currentIndex === -1 ? undefined : exercises[currentIndex];
  const openExercise = (exercise: (typeof exercises)[number]) =>
    navigation.navigate('ExerciseLog', { sessionExercise: exercise });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: clearance }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <Text style={styles.title}>Hoy</Text>
        <ProfileAvatar />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {data === null && !error && (
        <View style={[styles.card, styles.emptyCard]}>
          <ChainBackground />
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No tienes una sesión pendiente</Text>
            <Text style={styles.emptyText}>Cuando tu coach te asigne una, la verás aquí.</Text>
          </View>
        </View>
      )}

      {data && (
        <>
          <View style={styles.hero}>
            <BeadChain />
            <View style={styles.heroTop}>
              <Text style={styles.heroWeek}>Semana {data.cycle.currentWeek}</Text>
              {assignedHere && (
                <View style={styles.assignedPill}>
                  <Text style={styles.assignedPillText}>Asignada para hoy</Text>
                </View>
              )}
            </View>
            <Text style={styles.heroTitle}>{data.session.name}</Text>
            <View style={styles.heroCount}>
              <Text style={styles.heroNumber}>{doneCount}</Text>
              <Text style={styles.heroOf}>de {exercises.length} ejercicios</Text>
            </View>
            <View style={styles.segments}>
              {exercises.map(e => (
                <View key={e.id} style={[styles.segment, isComplete(e) && styles.segmentDone]} />
              ))}
            </View>

            {routineStarted ? (
              nextExercise ? (
                <PressableScale style={styles.heroButton} onPress={() => openExercise(nextExercise)}>
                  <Text style={styles.heroButtonText} numberOfLines={1}>
                    Continuar: {nextExercise.exercise.name}
                  </Text>
                  <Icon name="arrowRight" size={20} color={colors.ink} />
                </PressableScale>
              ) : (
                <PressableScale style={[styles.heroButton, styles.heroButtonDone]} onPress={openFeedback}>
                  <Text style={[styles.heroButtonText, { color: colors.onBlue }]}>Cerrar sesión</Text>
                  <Icon name="arrowRight" size={20} color={colors.onBlue} />
                </PressableScale>
              )
            ) : (
              <PressableScale
                style={[styles.heroButton, starting && styles.disabled]}
                onPress={handleStart}
                disabled={starting}>
                {starting ? (
                  <Spinner size={22} color={colors.ink} />
                ) : (
                  <>
                    <Text style={styles.heroButtonText}>Iniciar rutina</Text>
                    <Icon name="arrowRight" size={20} color={colors.ink} />
                  </>
                )}
              </PressableScale>
            )}
          </View>

          {routineStarted && !nextExercise && (
            <>
              <View style={styles.statsRow}>
                <View style={[styles.card, styles.statCard]}>
                  <Text style={styles.statNumber}>{doneSets}</Text>
                  <Text style={styles.statLabel}>series</Text>
                </View>
                <View style={[styles.card, styles.statCard]}>
                  <Text style={styles.statNumber}>{elapsedMinutes ?? '–'}</Text>
                  <Text style={styles.statLabel}>minutos</Text>
                </View>
              </View>
              <View style={[styles.card, styles.doneMessage]}>
                <Icon name="check" size={22} color={colors.okInk} />
                <Text style={styles.doneMessageText}>Terminaste todos los ejercicios</Text>
              </View>
            </>
          )}

          {(otherAssigned.length > 0 || selectedId) && !routineStarted && (
            <View style={styles.card}>
              {otherAssigned.length > 0 && (
                <>
                  <Text style={styles.assignedTitle}>Asignadas para hoy</Text>
                  {otherAssigned.map(a => (
                    <TouchableOpacity
                      key={a.id}
                      style={styles.assignedRow}
                      onPress={() => setSelectedId(a.id)}
                      accessibilityLabel={`Hacer ${a.name}`}>
                      <View style={styles.flex}>
                        <Text style={styles.assignedName}>{a.name}</Text>
                        <Text style={styles.assignedMeta}>{`Semana ${a.weekNumber}, sesión ${a.slotNumber}`}</Text>
                      </View>
                      <Text style={styles.assignedAction}>Hacer esta</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
              {selectedId && (
                <TouchableOpacity style={styles.assignedRow} onPress={() => setSelectedId(null)}>
                  <Text style={styles.assignedAction}>Volver a la siguiente sesión del plan</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {!routineStarted && (
            <View style={[styles.card, styles.restCard]}>
              <View style={styles.restText}>
                <Text style={styles.restTitle}>Pausas automáticas</Text>
                <Text style={styles.restHint}>Descanso por defecto: {DEFAULT_REST_SECONDS} s</Text>
              </View>
              <Switch
                value={autoRest}
                onValueChange={setAutoRest}
                trackColor={{ true: colors.blue, false: colors.grayBorder }}
              />
            </View>
          )}

          {exercises.map((sessionExercise, index) => {
            const loggedSets = sessionExercise.logs.length;
            const complete = isComplete(sessionExercise);
            const current = routineStarted && !complete && index === currentIndex;
            return (
              <PressableScale
                key={sessionExercise.id}
                style={[
                  styles.card,
                  styles.exerciseCard,
                  current && styles.exerciseCardCurrent,
                  !complete && !current && styles.exerciseCardPending,
                ]}
                disabled={!routineStarted}
                onPress={() => openExercise(sessionExercise)}>
                <View
                  style={[
                    styles.node,
                    complete && styles.nodeDone,
                    current && styles.nodeCurrent,
                    !complete && !current && styles.nodePending,
                  ]}>
                  {complete ? (
                    <Icon name="check" size={16} color={colors.onBlue} strokeWidth={2.5} />
                  ) : (
                    <Text style={[styles.nodeText, current && styles.nodeTextCurrent]}>{index + 1}</Text>
                  )}
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{sessionExercise.exercise.name}</Text>
                  <Text style={styles.exerciseTarget}>
                    {sessionExercise.targetSets} × {sessionExercise.targetReps}
                    {sessionExercise.targetWeight ? ` · ${sessionExercise.targetWeight} kg` : ''}
                  </Text>
                </View>
                <View
                  style={[
                    styles.progressPill,
                    complete && styles.progressPillDone,
                    current && styles.progressPillCurrent,
                  ]}>
                  <Text
                    style={[
                      styles.progressPillText,
                      complete && styles.progressPillTextDone,
                      current && styles.progressPillTextCurrent,
                    ]}>
                    {loggedSets}/{sessionExercise.targetSets}
                  </Text>
                </View>
              </PressableScale>
            );
          })}

          {routineStarted && <RestBar />}

          {routineStarted && nextExercise && (
            <TouchableOpacity
              style={styles.closeLink}
              onPress={openFeedback}>
              <Text style={styles.closeLinkText}>Cerrar sesión</Text>
            </TouchableOpacity>
          )}
        </>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgApp },
  content: { paddingHorizontal: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgApp },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 32, fontWeight: '800', color: colors.ink },
  heroButtonDone: { backgroundColor: colors.brand },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statCard: { flex: 1 },
  statNumber: { fontSize: 30, lineHeight: 32, fontWeight: '800', color: colors.ink },
  statLabel: { fontSize: 12, color: colors.inkSecondary, marginTop: 2 },
  doneMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.okBg,
    marginBottom: 14,
  },
  doneMessageText: { color: colors.okInk, fontWeight: '600', fontSize: 14 },
  emptyCard: { height: 380, overflow: 'hidden', justifyContent: 'flex-end', padding: 20 },
  emptyBox: {
    backgroundColor: colors.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.grayBorder,
    padding: 16,
  },
  emptyTitle: { fontSize: 21, fontWeight: '800', color: colors.ink, marginBottom: 6 },
  error: { color: colors.painInk, marginBottom: 16 },
  emptyText: { fontSize: 14, color: colors.inkSecondary },
  hero: {
    backgroundColor: colors.ink,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    overflow: 'hidden',
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  heroWeek: { fontSize: 12, color: colors.inkMuted },
  assignedPill: { backgroundColor: colors.brand, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 },
  assignedPillText: { fontSize: 11, fontWeight: '700', color: colors.ink },
  flex: { flex: 1 },
  assignedTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  assignedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  assignedName: { fontSize: 15, fontWeight: '600', color: colors.ink },
  assignedMeta: { fontSize: 12, color: colors.inkSecondary, marginTop: 2 },
  assignedAction: { color: colors.blue, fontSize: 14, fontWeight: '600' },
  heroTitle: { fontSize: 26, fontWeight: '800', color: colors.onBlue, maxWidth: '75%', marginBottom: 16 },
  heroCount: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 14 },
  heroNumber: { fontSize: 48, lineHeight: 50, fontWeight: '800', color: colors.onBlue },
  heroOf: { fontSize: 15, color: colors.inkMuted, marginBottom: 6 },
  segments: { flexDirection: 'row', gap: 4, marginBottom: 18 },
  segment: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.inkTrack },
  segmentDone: { backgroundColor: colors.brand },
  heroButton: {
    backgroundColor: colors.onBlue,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroButtonText: { flex: 1, color: colors.ink, fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  card: { backgroundColor: colors.bg, borderRadius: 18, padding: 14, ...cardShadow },
  restCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  restText: { flex: 1 },
  restTitle: { fontSize: 15, fontWeight: '600', color: colors.ink },
  restHint: { fontSize: 12, color: colors.inkSecondary, marginTop: 2 },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  exerciseCardCurrent: { borderColor: colors.blue },
  exerciseCardPending: { opacity: 0.92 },
  node: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodePending: { backgroundColor: colors.bgApp },
  nodeDone: { backgroundColor: colors.brand },
  nodeCurrent: { backgroundColor: colors.blueTint, borderWidth: 2, borderColor: colors.blue },
  nodeText: { fontSize: 13, fontWeight: '700', color: colors.inkSecondary },
  nodeTextCurrent: { color: colors.blue },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: 16, fontWeight: '600', color: colors.ink },
  exerciseTarget: { fontSize: 13, color: colors.inkSecondary, marginTop: 2 },
  progressPill: { borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10 },
  progressPillDone: { backgroundColor: colors.okBg },
  progressPillCurrent: { backgroundColor: colors.blueTint },
  progressPillText: { fontSize: 12, fontWeight: '700', color: colors.inkSecondary },
  progressPillTextDone: { color: colors.okInk },
  progressPillTextCurrent: { color: colors.blue },
  closeLink: { alignItems: 'center', paddingVertical: 14 },
  closeLinkText: { color: colors.blue, fontSize: 15, fontWeight: '600' },
});
