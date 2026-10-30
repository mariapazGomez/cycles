import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Isotipo } from './Logo';
import { colors } from '../theme/colors';

interface Props {
  title: string;
  // Controles del lado derecho (campana, avatar).
  right?: React.ReactNode;
  // Sobre fondo oscuro.
  light?: boolean;
}

// Encabezado de las pestañas: el anillo de la marca junto al título. Quieto a
// propósito, para no distraer durante el entrenamiento.
export function ScreenHeader({ title, right, light }: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <Isotipo size={22} />
        <Text style={[styles.title, light && styles.titleLight]} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink },
  titleLight: { color: colors.onBlue },
});
