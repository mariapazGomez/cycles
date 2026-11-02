import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  note: string | null | undefined;
  // En listas apretadas (Hoy, detalle de la sesión) va más pequeña.
  compact?: boolean;
}

// La nota que el coach dejó en un ejercicio (CYC-63). Texto libre que puede hablar de
// salud: se muestra solo aquí, en las pantallas del atleta de esa sesión, y no viaja en
// los avisos. Sin nota no dibuja nada.
export function CoachNote({ note, compact = false }: Props) {
  if (!note) {
    return null;
  }
  return (
    <View
      style={[styles.box, compact && styles.boxCompact]}
      accessible
      accessibilityLabel={`Nota de tu coach: ${note}`}>
      <Text style={styles.label}>Nota de tu coach</Text>
      <Text style={[styles.text, compact && styles.textCompact]}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.blueTint,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  boxCompact: { marginTop: 6, marginBottom: 0, paddingVertical: 8 },
  label: { fontSize: 11, fontWeight: '700', color: colors.blue, marginBottom: 2 },
  text: { fontSize: 15, lineHeight: 21, color: colors.ink },
  textCompact: { fontSize: 13, lineHeight: 18 },
});
