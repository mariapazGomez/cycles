import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { TrainingCycle, TrainingSession } from '@cycles/shared';
import {
  Modal,
  Pressable,
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
import { scheduleSession } from '../services/executionApi';
import { fetchActiveCycles, fetchCycleSessions } from '../services/planApi';
import { colors } from '../theme/colors';
import { cardShadow } from '../theme/elevation';
import {
  firstPending,
  formatDay,
  formatWeekRange,
  isDayInPlan,
  planWeekAt,
  sessionDay,
  sessionState,
  toLocalDay,
  totalWeeks,
  weekDays,
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
  const [plans, setPlans] = useState<PlanData[] | undefined>(undefined);
  const [planIndex, setPlanIndex] = useState(0);
  const [week, setWeek] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Sesión a la que se le está eligiendo el día, y la semana que muestra la hoja.
  const [assigning, setAssigning] = useState<TrainingSession | null>(null);
  const [sheetWeek, setSheetWeek] = useState(1);
  const [saving, setSaving] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

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
  const today = toLocalDay(now);
  const currentWeek = plan ? planWeekAt(plan.cycle.startDate, now) : 0;
  const weeks = plan ? totalWeeks(plan.cycle, plan.sessions) : 0;
  const shownWeek = week ?? Math.min(Math.max(currentWeek, 1), Math.max(weeks, 1));
  const nextPending = plan ? firstPending(plan.sessions) : undefined;
  const days = plan ? weekDays(plan.cycle.startDate, shownWeek) : [];

  const weekSessions = useMemo(
    () =>
      (plan?.sessions ?? [])
        .filter(s => s.weekNumber === shownWeek)
        .sort((a, b) => a.slotNumber - b.slotNumber),
    [plan, shownWeek],
  );

  const openAssign = (session: TrainingSession) => {
    setSheetError(null);
    setSheetWeek(session.weekNumber);
    setAssigning(session);
  };

  const saveDay = async (iso: string | null) => {
    if (!assigning || !plan || saving) {
      return;
    }
    setSaving(true);
    setSheetError(null);
    try {
      const updated = await scheduleSession(assigning.id, iso);
      setPlans(prev =>
        prev?.map(p =>
          p.cycle.id === plan.cycle.id
            ? { ...p, sessions: p.sessions.map(s => (s.id === assigning.id ? { ...s, ...updated } : s)) }
            : p,
        ),
      );
      setAssigning(null);
    } catch (err) {
      setSheetError(err instanceof Error ? err.message : 'No pudimos guardar el día.');
    } finally {
      setSaving(false);
    }
  };

  if (plans === undefined && !error) {
    return (
      <View style={styles.centered}>
        <Spinner size={44} />
      </View>
    );
  }

  return (
    <>
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

              <View style={styles.strip}>
                {days.map(d => {
                  const scheduled = plan.sessions.filter(s => sessionDay(s) === d.iso);
                  const isToday = d.iso === today;
                  return (
                    <View key={d.iso} style={styles.stripDay}>
                      <Text style={styles.stripLetter}>{d.letter}</Text>
                      <View style={[styles.stripNumber, isToday && styles.stripNumberToday]}>
                        <Text style={[styles.stripNumberText, isToday && { color: colors.onBlue }]}>{d.day}</Text>
                      </View>
                      <View style={styles.stripBeads}>
                        {scheduled.slice(0, 3).map(s => (
                          <View
                            key={s.id}
                            style={[
                              styles.stripBead,
                              s.status === 'completed' && styles.stripBeadDone,
                              s.status === 'skipped' && styles.stripBeadSkipped,
                              s.status === 'pending' && styles.stripBeadPending,
                            ]}
                          />
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {weekSessions.length === 0 ? (
              <View style={[styles.card, styles.row]}>
                <Text style={styles.emptyText}>No hay sesiones en esta semana.</Text>
              </View>
            ) : (
              weekSessions.map(session => {
                const state = sessionState(session, nextPending?.id, currentWeek);
                const isNext = state === 'next';
                const day = sessionDay(session);
                const canAssign = session.status === 'pending';
                return (
                  <PressableScale
                    key={session.id}
                    style={[styles.card, styles.row, isNext && styles.rowNext]}
                    disabled={!canAssign}
                    onPress={() => openAssign(session)}
                    accessibilityLabel={`Asignar día a ${session.name}`}>
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
                      <Text style={[styles.sessionSlot, canAssign && !day && styles.sessionNoDay]}>
                        {day ? formatDay(day) : canAssign ? 'Elegir día' : `Sesión ${session.slotNumber}`}
                      </Text>
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

      <Modal visible={assigning !== null} transparent animationType="slide" onRequestClose={() => setAssigning(null)}>
        <Pressable style={styles.backdrop} onPress={() => setAssigning(null)} />
        {assigning && plan && (
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.grabber} />
            <Text style={styles.sheetTitle}>¿Qué día harás esta sesión?</Text>
            <Text style={styles.sheetSession}>{assigning.name}</Text>

            <View style={styles.sheetWeekRow}>
              <TouchableOpacity
                onPress={() => setSheetWeek(w => Math.max(1, w - 1))}
                disabled={sheetWeek <= 1}
                hitSlop={10}
                accessibilityLabel="Semana anterior"
                style={sheetWeek <= 1 && styles.dim}>
                <Icon name="chevronLeft" size={24} color={colors.ink} />
              </TouchableOpacity>
              <View style={styles.sheetWeekTitle}>
                <Text style={styles.sheetWeekName}>{`Semana ${sheetWeek}`}</Text>
                <Text style={styles.sheetWeekRange}>{formatWeekRange(plan.cycle.startDate, sheetWeek)}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSheetWeek(w => Math.min(weeks, w + 1))}
                disabled={sheetWeek >= weeks}
                hitSlop={10}
                accessibilityLabel="Semana siguiente"
                style={[styles.flip, sheetWeek >= weeks && styles.dim]}>
                <Icon name="chevronLeft" size={24} color={colors.ink} />
              </TouchableOpacity>
            </View>

            <View style={styles.sheetDays}>
              {weekDays(plan.cycle.startDate, sheetWeek).map(d => {
                const inPlan = isDayInPlan(d.iso, plan.cycle);
                const selected = sessionDay(assigning) === d.iso;
                return (
                  <TouchableOpacity
                    key={d.iso}
                    style={[styles.sheetDay, selected && styles.sheetDayOn, !inPlan && styles.dim]}
                    disabled={!inPlan || saving}
                    onPress={() => saveDay(d.iso)}
                    accessibilityLabel={`Día ${d.iso}`}>
                    <Text style={[styles.sheetDayLetter, selected && styles.sheetDayTextOn]}>{d.letter}</Text>
                    <Text style={[styles.sheetDayNumber, selected && styles.sheetDayTextOn]}>{d.day}</Text>
                    {d.iso === today && <View style={[styles.todayDot, selected && { backgroundColor: colors.onBlue }]} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {sheetError && <Text style={styles.sheetError}>{sheetError}</Text>}
            {saving && (
              <View style={styles.savingRow}>
                <Spinner size={20} />
                <Text style={styles.emptyText}>Guardando</Text>
              </View>
            )}

            {sessionDay(assigning) && (
              <TouchableOpacity style={styles.clear} onPress={() => saveDay(null)} disabled={saving}>
                <Text style={styles.clearText}>Quitar el día asignado</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Modal>
    </>
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
  strip: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  stripDay: { width: 38, alignItems: 'center' },
  stripLetter: { fontSize: 11, color: colors.inkSecondary, marginBottom: 4 },
  stripNumber: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  stripNumberToday: { backgroundColor: colors.blue },
  stripNumberText: { fontSize: 14, fontWeight: '600', color: colors.ink },
  stripBeads: { flexDirection: 'row', gap: 3, height: 10, marginTop: 5 },
  stripBead: { width: 8, height: 8, borderRadius: 4 },
  stripBeadDone: { backgroundColor: colors.brand },
  stripBeadSkipped: { backgroundColor: colors.warnFill },
  stripBeadPending: { borderWidth: 2, borderColor: colors.brand, backgroundColor: colors.bg },
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
  sessionNoDay: { color: colors.blue, fontWeight: '600' },
  pill: { borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10, backgroundColor: colors.bgApp },
  pillDone: { backgroundColor: colors.okBg },
  pillWarn: { backgroundColor: colors.warnBg },
  pillNext: { backgroundColor: colors.blueTint },
  pillText: { fontSize: 12, fontWeight: '700', color: colors.inkSecondary },
  emptyCard: { height: 380, overflow: 'hidden', justifyContent: 'flex-end', padding: 20 },
  emptyBox: { backgroundColor: colors.bg, borderRadius: 14, borderWidth: 1, borderColor: colors.grayBorder, padding: 16 },
  emptyTitle: { fontSize: 21, fontWeight: '800', color: colors.ink, marginBottom: 6 },
  emptyText: { fontSize: 14, color: colors.inkSecondary },
  backdrop: { flex: 1, backgroundColor: 'rgba(31,34,40,0.35)' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 16, paddingTop: 10 },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.grayDot, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: colors.ink },
  sheetSession: { fontSize: 14, color: colors.inkSecondary, marginTop: 2, marginBottom: 14 },
  sheetWeekRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetWeekTitle: { alignItems: 'center' },
  sheetWeekName: { fontSize: 16, fontWeight: '700', color: colors.ink },
  sheetWeekRange: { fontSize: 12, color: colors.inkSecondary },
  flip: { transform: [{ scaleX: -1 }] },
  dim: { opacity: 0.35 },
  sheetDays: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sheetDay: { width: 40, height: 66, borderRadius: 14, backgroundColor: colors.bgApp, alignItems: 'center', justifyContent: 'center', gap: 2 },
  sheetDayOn: { backgroundColor: colors.blue },
  sheetDayLetter: { fontSize: 11, color: colors.inkSecondary },
  sheetDayNumber: { fontSize: 18, fontWeight: '800', color: colors.ink },
  sheetDayTextOn: { color: colors.onBlue },
  todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.blue },
  sheetError: { color: colors.painInk, fontSize: 13, marginBottom: 8 },
  savingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  clear: { alignItems: 'center', paddingVertical: 12 },
  clearText: { color: colors.painInk, fontSize: 14, fontWeight: '600' },
});
