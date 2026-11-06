import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { GLYPHS, GLYPH_VIEWBOX } from './glyphs';
import { FAMILY_COLOR, type Kind } from './eventKinds';

interface Props {
  kind: Kind;
  size?: number;
}

// Perla de color con el pictograma relleno en blanco (diseño v3). Decorativa para el lector
// de pantalla: el nombre y la hora van en el texto de la tarjeta. El estilo final (anillo,
// tamaños por vista) se ajusta cuando la usuaria apruebe el diseño.
export function EventGlyph({ kind, size = 22 }: Props) {
  const glyphSize = size * 0.6;
  const offset = (size - glyphSize) / 2;
  const scale = glyphSize / GLYPH_VIEWBOX;
  return (
    <Svg width={size} height={size} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={FAMILY_COLOR[kind.family]} />
      <Path d={GLYPHS[kind.glyph]} fill="#ffffff" transform={`translate(${offset} ${offset}) scale(${scale})`} />
    </Svg>
  );
}
