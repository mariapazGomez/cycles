import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PlanVsRealChart } from './charts/PlanVsRealChart';
import { Sparkline } from './charts/Sparkline';
import { colors } from '../theme/colors';
import { cardShadow } from '../theme/elevation';
import {
  formatChange,
  formatValue,
  type ExerciseSummary,
} from '../utils/exerciseProgress';

interface Props {
  summary: ExerciseSummary;
  expanded: boolean;
  onToggle: () => void;
}

// Tarjeta de un ejercicio que se repitió (CYC-241): peso y repeticiones de la primera
// a la última sesión, con una línea pequeña cada uno. Sin verde ni rojo: la flecha y el
// signo dicen la dirección. Al tocarla se abre el gráfico de cada sesión.
export function ExerciseProgressCard({ summary, expanded, onToggle }: Props) {
  const { source } = summary;
  const sessions = source.sessions;
  const label = (week: number) => `Sem ${week}`;
  const weightData = sessions
    .filter(s => s.actualWeight !== null)
    .map(s => ({
      label: label(s.weekNumber),
      plan: s.plannedWeight,
      real: s.actualWeight as number,
    }));
  const repsData = sessions.map(s => ({
    label: label(s.weekNumber),
    plan: s.plannedReps as number | null,
    real: s.actualReps,
  }));

  const weightText = summary.hasWeight
    ? `${formatValue(summary.firstWeight as number)} → ${formatValue(
        summary.lastWeight as number,
      )} kg`
    : 'Peso corporal';
  const spoken = `${summary.name}. ${
    summary.hasWeight
      ? `Peso de ${weightText}, ${formatChange(summary.weightDelta, 'kg')}. `
      : 'Peso corporal. '
  }Repeticiones de ${formatValue(summary.firstReps)} a ${formatValue(
    summary.lastReps,
  )}, ${formatChange(summary.repsDelta)}.`;

  return (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={spoken}
        accessibilityHint={
          expanded
            ? 'Oculta el detalle por sesión'
            : 'Muestra el detalle por sesión'
        }
        accessibilityState={{ expanded }}
        style={styles.head}
      >
        <Text style={styles.name} numberOfLines={2}>
          {summary.name}
        </Text>
        <Text style={styles.sessions}>{sessions.length} sesiones</Text>
      </TouchableOpacity>
      <View style={styles.row}>
        <View style={styles.metric}>
          <Text style={styles.value}>{weightText}</Text>
          {summary.hasWeight && (
            <Text style={[styles.change, { color: colors.blue }]}>
              {formatChange(summary.weightDelta, 'kg')}
            </Text>
          )}
        </View>
        {summary.hasWeight && (
          <Sparkline values={summary.weights} color={colors.blue} />
        )}
      </View>
      <View style={styles.row}>
        <View style={styles.metric}>
          <Text style={styles.value}>{`${formatValue(
            summary.firstReps,
          )} → ${formatValue(summary.lastReps)} reps`}</Text>
          <Text style={[styles.change, { color: colors.ink }]}>
            {formatChange(summary.repsDelta)}
          </Text>
        </View>
        <Sparkline values={summary.reps} color={colors.ink} />
      </View>
      {expanded && (
        <View style={styles.detail}>
          {summary.hasWeight && (
            <PlanVsRealChart
              title="Peso por sesión"
              unit="kg"
              data={weightData}
            />
          )}
          <View style={summary.hasWeight ? styles.gap : undefined}>
            <PlanVsRealChart
              title="Repeticiones por sesión"
              unit="reps"
              data={repsData}
              height={160}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg,
    borderRadius: 18,
    padding: 14,
    marginBottom: 8,
    ...cardShadow,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
    minHeight: 44,
    marginBottom: 4,
  },
  name: { fontSize: 15, fontWeight: '700', color: colors.ink, flexShrink: 1 },
  sessions: { fontSize: 12, color: colors.inkSecondary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: 12,
  },
  metric: { flexShrink: 1 },
  value: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  change: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  detail: { marginTop: 12 },
  gap: { marginTop: 12 },
});
