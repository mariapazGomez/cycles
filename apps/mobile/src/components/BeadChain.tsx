import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';

// [x, y, radio, opacidad] sobre un lienzo de 170 × 130.
const BEADS: Array<[number, number, number, number]> = [
  [10, 90, 5, 0.5], [28, 70, 7, 0.8], [50, 56, 4, 0.4], [72, 50, 8, 0.9], [96, 52, 5, 0.5],
  [118, 44, 7, 0.8], [138, 28, 4, 0.4], [152, 10, 8, 0.9], [40, 100, 4, 0.3], [62, 92, 6, 0.6],
  [88, 96, 4, 0.35], [112, 84, 7, 0.7], [134, 70, 5, 0.5], [156, 56, 8, 0.85],
];

// Fragmento de la cadena de proteína de la marca, solo como decoración de
// fondo (detrás de texto sobre superficies oscuras).
export function BeadChain() {
  return (
    <View style={styles.box} pointerEvents="none">
      {BEADS.map(([x, y, r, o], i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: x - r,
            top: y - r,
            width: r * 2,
            height: r * 2,
            borderRadius: r,
            backgroundColor: colors.brand,
            opacity: o,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { position: 'absolute', right: -20, top: -10, width: 170, height: 130 },
});
