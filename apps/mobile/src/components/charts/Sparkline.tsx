import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { linePath, scaleLinear, xPositions } from '../../utils/chartMath';

interface Props {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}

// Línea pequeña con un punto por sesión; la última, llena. Sin ejes ni texto: el
// valor y el cambio van escritos al lado (decorativa para el lector de pantalla).
export function Sparkline({ values, color, width = 96, height = 32 }: Props) {
  if (values.length === 0) {
    return null;
  }
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = 5;
  const y = scaleLinear(lo === hi ? [lo - 1, hi + 1] : [lo, hi], [
    height - pad,
    pad,
  ]);
  const xs = xPositions(values.length, pad, width - pad);
  const points = values.map((v, i) => ({ x: xs[i], y: y(v) }));
  const last = points[points.length - 1];
  return (
    <Svg
      width={width}
      height={height}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path
        d={linePath(points)}
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
      {points.slice(0, -1).map((p, i) => (
        <Circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={2.5}
          fill="#ffffff"
          stroke={color}
          strokeWidth={1.5}
        />
      ))}
      <Circle
        cx={last.x}
        cy={last.y}
        r={4}
        fill={color}
        stroke="#ffffff"
        strokeWidth={2}
      />
    </Svg>
  );
}
