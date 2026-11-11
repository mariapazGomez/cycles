import React from 'react';
import Svg, { Circle } from 'react-native-svg';
import { colors, viewColors } from '../../theme/colors';

interface Props {
  /** De 0 a 100. */
  percent: number;
  /** Diámetro en puntos. */
  size: number;
}

const STROKE_RATIO = 8 / 76;
const PEARL_RATIO = 5 / 76;

// Anillo de la semana (diseño vistas-app: 76 px, trazo de 8, perla de 5 al final del arco). Se
// dibuja sin animación; el porcentaje va en el texto de al lado, no solo en el arco.
export function WeekRing({ percent, size }: Props) {
  const stroke = size * STROKE_RATIO;
  const pearl = size * PEARL_RATIO;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const clamped = Math.min(100, Math.max(0, percent));
  const circumference = 2 * Math.PI * r;
  const angle = (clamped / 100) * 2 * Math.PI - Math.PI / 2;
  return (
    <Svg width={size} height={size} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Circle cx={c} cy={c} r={r} fill="none" stroke={viewColors.track} strokeWidth={stroke} />
      {clamped > 0 && (
        <Circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={colors.brand}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * circumference} ${circumference}`}
          transform={`rotate(-90 ${c} ${c})`}
        />
      )}
      {clamped > 0 && clamped < 100 && <Circle cx={c + r * Math.cos(angle)} cy={c + r * Math.sin(angle)} r={pearl} fill={colors.bg} stroke={colors.brand} strokeWidth={2} />}
    </Svg>
  );
}
