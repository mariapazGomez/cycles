import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme/colors';

const RADII = [5, 8, 4, 6, 7];
const OPACITIES = [0.8, 0.4, 0.6, 0.3, 0.7];

// Cadena de proteína de la marca: tres recorridos (arriba, centro, abajo)
// que pasan por detrás de las tarjetas opacas. Solo decoración de fondo.
export function ChainBackground() {
  const { width, height } = useWindowDimensions();

  const beads = useMemo(() => {
    const chain = (count: number, y: (t: number) => number) =>
      Array.from({ length: count }, (_, i) => {
        const t = i / (count - 1);
        return {
          x: -10 + t * (width + 20),
          y: y(t),
          r: RADII[i % RADII.length],
          o: OPACITIES[i % OPACITIES.length],
        };
      });
    return [
      ...chain(24, t => height * 0.13 + Math.sin(t * 6) * 34 + t * 20),
      ...chain(24, t => height * 0.42 + Math.sin(t * 5 + 1) * 40 - t * 30),
      ...chain(24, t => height * 0.82 + Math.sin(t * 5 + 2) * 34),
    ];
  }, [width, height]);

  return (
    <Svg style={StyleSheet.absoluteFill} width={width} height={height} pointerEvents="none">
      {beads.map((b, i) => (
        <Circle key={i} cx={b.x} cy={b.y} r={b.r} fill={colors.brand} opacity={b.o} />
      ))}
    </Svg>
  );
}
