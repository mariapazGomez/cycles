import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { TrainingCycle, TrainingSession } from '@cycles/shared';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BeadChain } from '../components/BeadChain';
import { ChainBackground } from '../components/ChainBackground';
import { Icon } from '../components/Icon';
import { PressableScale } from '../components/PressableScale';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { Spinner } from '../components/Spinner';
import { useTabBarClearance } from '../components/FloatingTabBar';
import { fetchActiveCycles, fetchCycleSessions } from '../services/planApi';
import { colors } from '../theme/colors';
import { cardShadow } from '../theme/elevation';
import {
  firstPending,
  formatWeekRange,
  planWeekAt,
  sessionState,
  totalWeeks,
  weekProgress,
  type SessionState,
} from '../utils/planCalendar';

interface PlanData {
  cycle: TrainingCycle;
  sessions: TrainingSession[];
}

const STATE_LABEL: Record<SessionState, string> = {
  done: 'Hecha',
  skipped: 'No hecha',
  next: 'Siguiente',
  late: 'Atrasada',
  pending: 'Pendiente',
};

export function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const clearance = useTabBarClearance();
  const navigation = useNavigation();
  const [plans, setPlans] = useState<PlanData[] | undefined>(undefined);
  const [planIndex, setPlanIndex] = useState(0);
  const [week, setWeek] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const cycles = await fetchActiveCycles();
      const ordered = [...cycles].sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate));
      const loaded = await Promise.all(
        ordered.map(async cycle => ({ cycle, sessions: await fetchCycleSessions(cycle.id) })),
      );
      setPlans(loaded);
    } catch {
      setError('No pudimos cargar tu calendario. Desliza para reintentar.');
    }
  }, []);

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

  const plan = plans?.[Math.min(planIndex, Math.max((plans?.length ?? 1) - 1, 0))];
  const now = new Date();
  const currentWeek = plan ? planWeekAt(plan.cycle.startDate, now) : 0;
  const weeks = plan ? totalWeeks(plan.cycle, plan.sessions) : 0;
  const shownWeek = week ?? Math.min(Math.max(currentWeek, 1), Math.max(weeks, 1));
  const nextPending = plan ? firstPending(plan.sessions) : undefined;

  const weekSessions = useMemo(
    () =>
      (plan?.sessions ?? [])
        .filter(s => s.weekNumber === shownWeek)
        .sort((a, b) => a.slotNumber - b.slotNumber),
    [plan, shownWeek],
  );

  if (plans === undefined && !error) {
    return (
      <View style={styles.centered}>
        <Spinner size={44} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: clearance }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendario</Text>
        <ProfileAvatar />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {plans && plans.length === 0 && !error && (
        <View style={[styles.card, styles.emptyCard]}>
          <ChainBackground />
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Aún no tienes un plan activo</Text>
            <Text style={styles.emptyText}>Cuando tu coach active uno, verás tus sesiones aquí.</Text>
          </View>
        </View>
      )}

      {plan && (
        <>
          {plans && plans.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {plans.map((p, index) => {
                const on = index === planIndex;
                return (
                  <TouchableOpacity
                    key={p.cycle.id}
                    style={[styles.planChip, on && styles.planChipOn]}
                    onPress={() => {
                      setPlanIndex(index);
                      setWeek(null);
                    }}>
                    <Text style={[styles.planChipText, on && styles.planChipTextOn]} numberOfLines={1}>
                      {p.cycle.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.hero}>
            <BeadChain />
            <Text style={styles.heroTitle}>{plan.cycle.name}</Text>
            <View style={styles.heroCount}>
              <Text style={styles.heroNumber}>{currentWeek === 0 ? 0 : Math.min(currentWeek, weeks)}</Text>
              <Text style={styles.heroOf}>
                {currentWeek === 0 ? `de ${weeks} semanas, aún no empieza` : `de ${weeks} semanas`}
              </Text>
            </View>
            <View style={styles.segments}>
              {Array.from({ length: weeks }, (_, i) => {
                const n = i + 1;
                const { done, total } = weekProgress(plan.sessions, n);
                return (
                  <View
                    key={n}
                    style={[
                      styles.segment,
                      total > 0 && done === total && styles.segmentDone,
                      n === currentWeek && styles.segmentCurrent,
                    ]}
                  />
                );
              })}
            </View>
          </View>

          <View style={[styles.card, styles.weekCard]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekRow}>
              {Array.from({ length: weeks }, (_, i) => {
                const n = i + 1;
                const selected = n === shownWeek;
                const isCurrent = n === currentWeek;
                return (
                  <TouchableOpacity
                    key={n}
                    style={[styles.weekChip, selected && styles.weekChipOn, isCurrent && !selected && styles.weekChipCurrent]}
                    onPress={() => setWeek(n)}
                    accessibilityLabel={`Semana ${n}`}>
                    <Text style={[styles.weekChipText, selected && styles.weekChipTextOn]}>S{n}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Text style={styles.weekTitle}>{`Semana ${shownWeek}`}</Text>
            <Text style={styles.weekRange}>{formatWeekRange(plan.cycle.startDate, shownWeek)}</Text>
          </View>

          {weekSessions.length === 0 ? (
            <View style={[styles.card, styles.row]}>
              <Text style={styles.emptyText}>No hay sesiones en esta semana.</Text>
            </View>
          ) : (
            weekSessions.map(session => {
              const state = sessionState(session, nextPending?.id, currentWeek);
              const isNext = state === 'next';
              return (
                <PressableScale
                  key={session.id}
                  style={[styles.card, styles.row, isNext && styles.rowNext]}
                  disabled={!isNext}
                  onPress={() => navigation.navigate('Today' as never)}>
                  <View
                    style={[
                      styles.node,
                      state === 'done' && styles.nodeDone,
                      (state === 'skipped' || state === 'late') && styles.nodeWarn,
                      isNext && styles.nodeNext,
                    ]}>
                    {state === 'done' ? (
                      <Icon name="check" size={16} color={colors.onBlue} strokeWidth={2.5} />
                    ) : (
                      <Text style={[styles.nodeText, isNext && { color: colors.blue }]}>{session.slotNumber}</Text>
                    )}
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.sessionName}>{session.name}</Text>
                    <Text style={styles.sessionSlot}>{`Sesión ${session.slotNumber}`}</Text>
                  </View>
                  <View
                    style={[
                      styles.pill,
                      state === 'done' && styles.pillDone,
                      (state === 'skipped' || state === 'late') && styles.pillWarn,
                      isNext && styles.pillNext,
                    ]}>
                    <Text
                      style={[
                        styles.pillText,
                        state === 'done' && { color: colors.okInk },
                        (state === 'skipped' || state === 'late') && { color: colors.warnInk },
                        isNext && { color: colors.blue },
                      ]}>
                      {STATE_LABEL[state]}
                    </Text>
                  </View>
                </PressableScale>
              );
            })
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
  error: { color: colors.painInk, marginBottom: 16 },
  card: { backgroundColor: colors.bg, borderRadius: 18, padding: 14, marginBottom: 10, ...cardShadow },
  chipRow: { gap: 8, paddingBottom: 12 },
  planChip: { backgroundColor: colors.bg, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, maxWidth: 220, ...cardShadow },
  planChipOn: { backgroundColor: colors.ink },
  planChipText: { fontSize: 13, fontWeight: '600', color: colors.inkSecondary },
  planChipTextOn: { color: colors.onBlue },
  hero: { backgroundColor: colors.ink, borderRadius: 22, padding: 16, marginBottom: 10, overflow: 'hidden' },
  heroTitle: { fontSize: 21, fontWeight: '800', color: colors.onBlue, maxWidth: '72%', marginBottom: 8 },
  heroCount: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  heroNumber: { fontSize: 40, lineHeight: 42, fontWeight: '800', color: colors.onBlue },
  heroOf: { fontSize: 14, color: colors.inkMuted, marginBottom: 5, flexShrink: 1 },
  segments: { flexDirection: 'row', gap: 4, marginTop: 12 },
  segment: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.inkTrack },
  segmentDone: { backgroundColor: colors.brand },
  segmentCurrent: { backgroundColor: colors.onBlue },
  weekCard: { paddingBottom: 12 },
  weekRow: { gap: 8, paddingBottom: 12 },
  weekChip: { minWidth: 44, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgApp, paddingHorizontal: 12 },
  weekChipOn: { backgroundColor: colors.ink },
  weekChipCurrent: { borderWidth: 2, borderColor: colors.blue },
  weekChipText: { fontSize: 14, fontWeight: '700', color: colors.inkSecondary },
  weekChipTextOn: { color: colors.onBlue },
  weekTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  weekRange: { fontSize: 13, color: colors.inkSecondary, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowNext: { borderWidth: 2, borderColor: colors.blue },
  node: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.bgApp, alignItems: 'center', justifyContent: 'center' },
  nodeDone: { backgroundColor: colors.brand },
  nodeWarn: { backgroundColor: colors.warnBg },
  nodeNext: { backgroundColor: colors.blueTint, borderWidth: 2, borderColor: colors.blue },
  nodeText: { fontSize: 13, fontWeight: '700', color: colors.inkSecondary },
  rowInfo: { flex: 1 },
  sessionName: { fontSize: 16, fontWeight: '600', color: colors.ink },
  sessionSlot: { fontSize: 13, color: colors.inkSecondary, marginTop: 2 },
  pill: { borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10, backgroundColor: colors.bgApp },
  pillDone: { backgroundColor: colors.okBg },
  pillWarn: { backgroundColor: colors.warnBg },
  pillNext: { backgroundColor: colors.blueTint },
  pillText: { fontSize: 12, fontWeight: '700', color: colors.inkSecondary },
  emptyCard: { height: 380, overflow: 'hidden', justifyContent: 'flex-end', padding: 20 },
  emptyBox: { backgroundColor: colors.bg, borderRadius: 14, borderWidth: 1, borderColor: colors.grayBorder, padding: 16 },
  emptyTitle: { fontSize: 21, fontWeight: '800', color: colors.ink, marginBottom: 6 },
  emptyText: { fontSize: 14, color: colors.inkSecondary },
});
