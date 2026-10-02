import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { TrainingCycle, TrainingSession } from '@cycles/shared';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BodyMap } from '../components/BodyMap';
import { ChainBackground } from '../components/ChainBackground';
import { useTabBarClearance } from '../components/FloatingTabBar';
import { MuscleStackChart } from '../components/MuscleStackChart';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { ShareBar } from '../components/ShareBar';
import { ShareList } from '../components/ShareList';
import { Spinner } from '../components/Spinner';
import { fetchActiveCycles, fetchCycleSessions, fetchMuscleSummary } from '../services/planApi';
import { colors, noLoadFill } from '../theme/colors';
import { cardShadow } from '../theme/elevation';
import {
  GROUPS,
  barsByDay,
  barsByWeek,
  groupFill,
  intensityColor,
  shares,
  total,
  totalsByGroup,
  weekStreak,
  type GroupKey,
  type Metric,
  type MuscleDay,
} from '../utils/muscleSummary';
import { planWeekAt } from '../utils/planCalendar';

interface PlanData {
  cycle: TrainingCycle;
  sessions: TrainingSession[];
  days: MuscleDay[];
}

type Granularity = 'day' | 'week';

const UNIT: Record<Metric, string> = { sets: ' series', kg: ' kg' };
const SCALE_STEPS = [0.1, 0.325, 0.55, 0.775, 1];

function Toggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.toggle}>
      {options.map(option => (
        <TouchableOpacity
          key={option.value}
          style={[styles.toggleItem, value === option.value && styles.toggleOn]}
          onPress={() => onChange(option.value)}
          accessibilityLabel={option.label}>
          <Text style={[styles.toggleText, value === option.value && styles.toggleTextOn]}>{option.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function SummaryScreen() {
  const insets = useSafeAreaInsets();
  const clearance = useTabBarClearance();
  const [plans, setPlans] = useState<PlanData[] | undefined>(undefined);
  const [planIndex, setPlanIndex] = useState(0);
  const [metric, setMetric] = useState<Metric>('sets');
  const [gran, setGran] = useState<Granularity>('day');
  const [picked, setPicked] = useState<number | null>(null);
  const [mapWeek, setMapWeek] = useState<number | 'all'>('all');
  const [mapGroup, setMapGroup] = useState<GroupKey>('legs');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const cycles = await fetchActiveCycles();
      const ordered = [...cycles].sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate));
      const loaded = await Promise.all(
        ordered.map(async cycle => {
          const [sessions, summary] = await Promise.all([fetchCycleSessions(cycle.id), fetchMuscleSummary(cycle.id)]);
          return { cycle, sessions, days: summary.days };
        }),
      );
      setPlans(loaded);
    } catch {
      setError('No pudimos cargar tu resumen. Desliza para reintentar.');
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
  const days = useMemo(() => plan?.days ?? [], [plan]);
  const bars = useMemo(() => (gran === 'day' ? barsByDay(days, metric) : barsByWeek(days, metric)), [days, gran, metric]);
  const selected = Math.min(picked ?? bars.length - 1, bars.length - 1);
  const bar = bars[selected];
  const mapTotals = useMemo(() => totalsByGroup(days, metric, mapWeek), [days, metric, mapWeek]);
  const allTotals = useMemo(() => totalsByGroup(days, metric), [days, metric]);
  const weeksWithData = useMemo(() => [...new Set(days.map(d => d.weekNumber))].sort((a, b) => a - b), [days]);

  if (plans === undefined && !error) {
    return (
      <View style={styles.centered}>
        <Spinner size={44} />
      </View>
    );
  }

  const sessions = plan?.sessions ?? [];
  const done = sessions.filter(s => s.status === 'completed').length;
  const ordered = [...sessions].sort((a, b) => a.weekNumber - b.weekNumber || a.slotNumber - b.slotNumber);
  const streak = plan ? weekStreak(sessions, planWeekAt(plan.cycle.startDate, new Date())) : 0;

  const mapMax = Math.max(0, ...mapTotals);
  const mapIndex = GROUPS.findIndex(g => g.key === mapGroup);
  const mapValue = mapTotals[mapIndex] ?? 0;
  const mapShare = total(mapTotals) > 0 ? (mapValue / total(mapTotals)) * 100 : 0;
  const mapRank = shares(mapTotals).findIndex(s => s.key === mapGroup) + 1;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: clearance }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <Text style={styles.title}>Resumen</Text>
        <ProfileAvatar />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {plans && plans.length === 0 && !error && (
        <View style={[styles.card, styles.emptyCard]}>
          <ChainBackground />
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Aún no tienes un plan activo</Text>
            <Text style={styles.emptyText}>Cuando tu coach active uno, verás tu progreso aquí.</Text>
          </View>
        </View>
      )}

      {plan && (
        <>
          {plans && plans.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {plans.map((p, index) => (
                <TouchableOpacity
                  key={p.cycle.id}
                  style={[styles.planChip, index === planIndex && styles.planChipOn]}
                  onPress={() => {
                    setPlanIndex(index);
                    setPicked(null);
                    setMapWeek('all');
                  }}>
                  <Text style={[styles.planChipText, index === planIndex && styles.planChipTextOn]} numberOfLines={1}>
                    {p.cycle.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.hero}>
            <Text style={styles.heroPlan}>{plan.cycle.name}</Text>
            <View style={styles.heroRow}>
              <Text style={styles.heroNumber}>{`${done}`}</Text>
              <Text style={styles.heroOf}>{`de ${sessions.length} sesiones hechas`}</Text>
              {streak > 0 && (
                <Text style={styles.heroStreak}>{streak === 1 ? '1 semana seguida' : `${streak} semanas seguidas`}</Text>
              )}
            </View>
            <View style={styles.segments}>
              {ordered.map(s => (
                <View
                  key={s.id}
                  style={[
                    styles.segment,
                    s.status === 'completed' && styles.segmentDone,
                    s.status === 'skipped' && styles.segmentSkipped,
                  ]}
                />
              ))}
            </View>
          </View>

          {days.length === 0 ? (
            <View style={[styles.card, styles.emptyCard]}>
              <ChainBackground />
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>Tu progreso empieza con la primera sesión</Text>
                <Text style={styles.emptyText}>Cuando registres series, verás aquí en qué grupos musculares entrenas.</Text>
              </View>
            </View>
          ) : (
            <>
              <Toggle
                options={[
                  { value: 'sets' as Metric, label: 'Series' },
                  { value: 'kg' as Metric, label: 'Carga (kg)' },
                ]}
                value={metric}
                onChange={value => {
                  setMetric(value);
                  setPicked(null);
                }}
              />

              <View style={[styles.card, styles.firstCard]}>
                <Text style={styles.cardTitle}>En qué grupos entrenas</Text>
                <Toggle
                  options={[
                    { value: 'day' as Granularity, label: 'Por día' },
                    { value: 'week' as Granularity, label: 'Por semana' },
                  ]}
                  value={gran}
                  onChange={value => {
                    setGran(value);
                    setPicked(null);
                  }}
                />
                <MuscleStackChart bars={bars} selected={selected} onSelect={setPicked} />
                <View style={styles.legend}>
                  {GROUPS.map(g => (
                    <View key={g.key} style={styles.legendItem}>
                      <View style={[styles.swatch, { backgroundColor: g.color }]} />
                      <Text style={styles.legendText}>{g.label}</Text>
                    </View>
                  ))}
                </View>
                {bar && (
                  <View style={styles.readout}>
                    <View style={styles.readoutHead}>
                      <Text style={styles.readoutTitle}>{bar.title}</Text>
                      <Text style={styles.readoutTotal}>
                        {Math.round(total(bar.values)).toLocaleString('es')}
                        <Text style={styles.readoutUnit}>{UNIT[metric]}</Text>
                      </Text>
                    </View>
                    <ShareBar values={bar.values} />
                    <ShareList values={bar.values} unit={UNIT[metric]} limit={4} />
                  </View>
                )}
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Mapa muscular</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {(['all', ...weeksWithData] as Array<number | 'all'>).map(w => (
                    <TouchableOpacity
                      key={String(w)}
                      style={[styles.weekChip, mapWeek === w && styles.weekChipOn]}
                      onPress={() => setMapWeek(w)}>
                      <Text style={[styles.weekChipText, mapWeek === w && styles.weekChipTextOn]}>
                        {w === 'all' ? 'Todo el plan' : `S${w}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <BodyMap totals={mapTotals} selected={mapGroup} onSelect={setMapGroup} />
                <View style={styles.scale}>
                  <Text style={styles.scaleText}>Menos</Text>
                  {SCALE_STEPS.map(t => (
                    <View key={t} style={[styles.scaleSwatch, { backgroundColor: intensityColor(t) }]} />
                  ))}
                  <Text style={styles.scaleText}>Más</Text>
                  <Text style={[styles.scaleText, styles.scaleNote]}>gris: sin {metric === 'kg' ? 'carga' : 'series'}</Text>
                </View>
                <View style={styles.readout}>
                  <View style={styles.readoutHead}>
                    <View style={styles.mapName}>
                      <View style={[styles.swatch, { backgroundColor: groupFill(mapValue, mapMax, noLoadFill) }]} />
                      <Text style={styles.readoutTitle}>{GROUPS[mapIndex].label}</Text>
                    </View>
                    <Text style={styles.readoutTotal}>
                      {Math.round(mapValue).toLocaleString('es')}
                      <Text style={styles.readoutUnit}>{UNIT[metric]}</Text>
                    </Text>
                  </View>
                  <Text style={styles.mapHint}>
                    {mapValue > 0
                      ? `${Math.round(mapShare)}% de lo que entrenaste, puesto ${mapRank} de ${GROUPS.length}`
                      : `Sin ${metric === 'kg' ? 'carga registrada' : 'series registradas'} en este periodo`}
                  </Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Foco del plan</Text>
                <ShareBar values={allTotals} />
                <ShareList values={allTotals} unit={UNIT[metric]} />
              </View>
            </>
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
  firstCard: { marginTop: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 8 },
  chipRow: { gap: 8, paddingBottom: 8 },
  planChip: { backgroundColor: colors.bg, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, maxWidth: 220, ...cardShadow },
  planChipOn: { backgroundColor: colors.ink },
  planChipText: { fontSize: 13, fontWeight: '600', color: colors.inkSecondary },
  planChipTextOn: { color: colors.onBlue },
  hero: { backgroundColor: colors.ink, borderRadius: 22, padding: 16, marginBottom: 10 },
  heroPlan: { fontSize: 12, color: colors.inkMuted },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 2 },
  heroNumber: { fontSize: 40, lineHeight: 42, fontWeight: '800', color: colors.onBlue },
  heroOf: { fontSize: 14, color: colors.inkMuted, marginBottom: 5, flexShrink: 1 },
  heroStreak: { marginLeft: 'auto', fontSize: 13, fontWeight: '600', color: colors.onBlue, marginBottom: 5 },
  segments: { flexDirection: 'row', gap: 4, marginTop: 10 },
  segment: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.inkTrack },
  segmentDone: { backgroundColor: colors.brand },
  segmentSkipped: { backgroundColor: colors.warnFill },
  toggle: { flexDirection: 'row', backgroundColor: colors.bgApp, borderRadius: 999, padding: 3, marginBottom: 6 },
  toggleItem: { flex: 1, alignItems: 'center', borderRadius: 999, paddingVertical: 7 },
  toggleOn: { backgroundColor: colors.ink },
  toggleText: { fontSize: 12, fontWeight: '600', color: colors.inkSecondary },
  toggleTextOn: { color: colors.onBlue },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, columnGap: 12, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: 12, color: colors.inkSecondary },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  readout: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#eef0f3', paddingTop: 10 },
  readoutHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  readoutTitle: { fontSize: 14, fontWeight: '600', color: colors.ink },
  readoutTotal: { fontSize: 20, fontWeight: '800', color: colors.ink },
  readoutUnit: { fontSize: 12, fontWeight: '400', color: colors.inkSecondary },
  mapName: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mapHint: { fontSize: 12, color: colors.inkSecondary, marginTop: 4 },
  weekChip: { backgroundColor: colors.bgApp, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  weekChipOn: { backgroundColor: colors.blueTint, borderWidth: 2, borderColor: colors.blue, paddingVertical: 4, paddingHorizontal: 10 },
  weekChipText: { fontSize: 12, fontWeight: '600', color: colors.inkSecondary },
  weekChipTextOn: { color: colors.blue },
  scale: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  scaleText: { fontSize: 11, color: colors.inkSecondary },
  scaleNote: { marginLeft: 'auto' },
  scaleSwatch: { width: 22, height: 10, borderRadius: 3 },
  emptyCard: { height: 360, overflow: 'hidden', justifyContent: 'flex-end', padding: 20 },
  emptyBox: { backgroundColor: colors.bg, borderRadius: 14, borderWidth: 1, borderColor: colors.grayBorder, padding: 16 },
  emptyTitle: { fontSize: 21, fontWeight: '800', color: colors.ink, marginBottom: 6 },
  emptyText: { fontSize: 14, color: colors.inkSecondary },
});
