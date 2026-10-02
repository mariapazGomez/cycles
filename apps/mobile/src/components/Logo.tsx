import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme/colors';

// Isotipo: el anillo con tres cortes.
export function Isotipo({ size = 30, color = colors.brand }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Path d="M50 12 A38 38 0 0 1 86 40" stroke={color} strokeWidth={20} strokeLinecap="round" transform="rotate(-20 50 50)" />
      <Path d="M80 66 A38 38 0 0 1 24 80" stroke={color} strokeWidth={20} strokeLinecap="round" transform="rotate(-20 50 50)" />
      <Path d="M16 60 A38 38 0 0 1 22 30" stroke={color} strokeWidth={20} strokeLinecap="round" transform="rotate(-20 50 50)" />
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
