import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { shares } from '../utils/muscleSummary';

// Reparto de un conjunto de valores en UNA sola barra que suma el 100%, con
// los grupos como tramos (porcentaje dentro si el tramo es ancho). Una barra
// por grupo parecería un avance pendiente; esta muestra proporción.
export function ShareBar({ values }: { values: number[] }) {
  const parts = shares(values);
  if (parts.length === 0) {
    return null;
  }
  return (
    <View style={styles.bar} accessibilityLabel="Reparto por grupo muscular">
      {parts.map((part, index) => (
        <View
          key={part.key}
          style={[
            styles.segment,
            { flex: part.pct, backgroundColor: part.color },
            index === 0 && styles.first,
            index === parts.length - 1 && styles.last,
          ]}>
          {part.pct >= 12 && <Text style={styles.label}>{`${Math.round(part.pct)}%`}</Text>}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', gap: 2, height: 22, marginVertical: 8 },
  segment: { height: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  first: { borderTopLeftRadius: 6, borderBottomLeftRadius: 6 },
  last: { borderTopRightRadius: 6, borderBottomRightRadius: 6 },
  label: { color: colors.onBlue, fontSize: 11, fontWeight: '700' },
});
