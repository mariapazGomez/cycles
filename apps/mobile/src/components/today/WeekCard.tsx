import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { WeeklySummary } from '@cycles/shared';
import { WeekRing } from './WeekRing';
import { colors } from '../../theme/colors';
import { cardShadow } from '../../theme/elevation';
import { useViewScale } from '../../hooks/useViewScale';
import { scaledSpace } from '../../utils/viewScale';
import { weeklyCard } from '../../utils/weeklySummary';

const RING = 76;
const RING_MAX = 100;

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.figure}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

// Tarjeta «Esta semana» al inicio de Hoy (CYC-256, docs/diseno/vistas-app): título con el rango,
// anillo con el porcentaje de sesiones hechas y tres cifras (sesiones, tiempo entrenado y
// esfuerzo medio de la semana). Con letra grande o pantalla angosta, el anillo va arriba y las
// cifras debajo. Sin sesiones esa semana, no existe. Se lee como una sola frase.
export function WeekCard({ summary }: { summary: WeeklySummary | null }) {
  const scale = useViewScale();
  const data = weeklyCard(summary);
  if (!data) {
    return null;
  }
  const size = Math.min(RING_MAX, Math.round(RING * scale.icon));
  return (
    <View style={styles.card} accessible accessibilityRole="summary" accessibilityLabel={data.spoken}>
      <View style={styles.head}>
        <Text style={styles.title}>Esta semana</Text>
        <Text style={styles.range}>{data.range}</Text>
      </View>
      <View style={[styles.body, scale.big && styles.bodyBig, { gap: scaledSpace(14, scale) }]}>
        <View style={[styles.ringBox, { width: size, height: size }]}>
          <WeekRing percent={data.percent} size={size} />
          <View style={styles.percentBox} pointerEvents="none">
            <Text style={styles.percent}>{`${data.percent}%`}</Text>
          </View>
        </View>
        <View style={styles.figures}>
          <Figure label="Sesiones" value={data.sessions} />
          <Figure label="Tiempo entrenado" value={data.time} />
          <Figure label="Esfuerzo medio" value={data.effort} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bg, borderRadius: 22, padding: 16, marginBottom: 12, ...cardShadow },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '800', color: colors.ink },
  range: { fontSize: 13, fontWeight: '600', color: colors.inkSecondary },
  body: { flexDirection: 'row', alignItems: 'center' },
  bodyBig: { flexDirection: 'column', alignItems: 'stretch' },
  ringBox: { alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  percentBox: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  percent: { fontSize: 18, fontWeight: '800', color: colors.ink },
  figures: { flex: 1, gap: 8 },
  figure: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', columnGap: 8 },
  label: { fontSize: 13, color: colors.inkSecondary },
  value: { fontSize: 16, fontWeight: '800', color: colors.ink },
});
