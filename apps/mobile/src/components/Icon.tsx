import React from 'react';
import Svg, { Path } from 'react-native-svg';

// Set de iconos propios: trazo redondeado de 2 px sobre cuadrícula de 24,
// como el isotipo. Al ser SVG se pueden animar (trazo, rotación, escala).
const PATHS = {
  calendar: [
    'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
    'M16 3v4M8 3v4M3 10h18',
  ],
  barbell: [
    'M2 12h1M6 8H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2',
    'M6 7v10a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z',
    'M9 12h6',
    'M15 7v10a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1a1 1 0 0 0-1 1z',
    'M18 8h2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M22 12h-1',
  ],
  chart: [
    'M3 13a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z',
    'M15 9a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z',
    'M9 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z',
    'M4 20h14',
  ],
  check: ['M5 12l5 5L20 7'],
  arrowRight: ['M5 12h14M13 18l6-6M13 6l6 6'],
  close: ['M18 6L6 18M6 6l12 12'],
  chevronLeft: ['M15 6l-6 6 6 6'],
  eye: ['M10 12a2 2 0 1 0 4 0a2 2 0 0 0-4 0', 'M21 12c-2.4 4-5.4 6-9 6s-6.6-2-9-6c2.4-4 5.4-6 9-6s6.6 2 9 6'],
  eyeOff: ['M10 12a2 2 0 1 0 4 0a2 2 0 0 0-4 0', 'M21 12c-2.4 4-5.4 6-9 6s-6.6-2-9-6c2.4-4 5.4-6 9-6s6.6 2 9 6', 'M3 3l18 18'],
  alert: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 8v4M12 16h.01'],
} as const;

export type IconName = keyof typeof PATHS;

interface Props {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 24, color, strokeWidth = 2 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {PATHS[name].map((d, i) => (
        <Path
          key={i}
          d={d}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
