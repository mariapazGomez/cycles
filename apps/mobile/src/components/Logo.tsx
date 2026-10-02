import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme/colors';

// Isotipo: el anillo con dos cortes opuestos, medido del logo (cortes en
// 131° y 307°, trazo de ~0,5 del radio).
export function Isotipo({ size = 30, color = colors.brand }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <Path d="M17.09 69 A38 38 0 0 1 61.74 13.86" stroke={color} strokeWidth={20} strokeLinecap="round" />
        <Path d="M81.5 28.75 A38 38 0 0 1 35.77 85.23" stroke={color} strokeWidth={20} strokeLinecap="round" />
    </Svg>
  );
}

export function Logo() {
  return (
    <View style={styles.row}>
      <Isotipo />
      <Text style={styles.word}>Cycles</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  word: { fontSize: 24, fontWeight: '800', color: colors.ink },
});
