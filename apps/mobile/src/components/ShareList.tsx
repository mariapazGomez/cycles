import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { shares } from '../utils/muscleSummary';

// Lista del reparto: nombre, valor y porcentaje por grupo, sin barras
// individuales (las proporciones se leen en la barra apilada de arriba).
export function ShareList({ values, unit, limit }: { values: number[]; unit: string; limit?: number }) {
  const parts = shares(values).slice(0, limit);
  return (
    <View>
      {parts.map((part, index) => (
        <View key={part.key} style={[styles.row, index > 0 && styles.divider]}>
          <View style={[styles.swatch, { backgroundColor: part.color }]} />
          <Text style={styles.name}>{part.label}</Text>
          <Text style={styles.value}>{`${Math.round(part.value).toLocaleString('es')}${unit}`}</Text>
          <Text style={[styles.value, styles.pct]}>{`${Math.round(part.pct)}%`}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  divider: { borderTopWidth: 1, borderTopColor: '#eef0f3' },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  name: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.ink },
  value: { fontSize: 13, color: colors.inkSecondary, fontVariant: ['tabular-nums'] },
  pct: { width: 36, textAlign: 'right' },
});
