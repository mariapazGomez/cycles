import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { pearlColors, viewColors } from '../../theme/colors';
import { GLYPHS, GLYPH_VIEWBOX, type GlyphName } from './glyphs';
import type { PearlFamily } from '../../theme/colors';

interface Props {
  /** Pictograma y familia de color (de `PEARL_KINDS`). */
  kind: { glyph: GlyphName; family?: PearlFamily };
  /** Color propio (los bloques de trabajo llevan el de su tipo); manda sobre la familia. */
  color?: string;
  /** Diámetro de la perla en puntos. */
  size?: number;
  /** Anillo exterior del color de la perla (diseño: hoy o seleccionada). */
  ring?: boolean;
}

// Perla de color con el pictograma relleno en blanco (diseño vistas-app). El pictograma
// ocupa el 58 % del diámetro; el anillo es de 2 px con 2 px de separación. Decorativa para el
// lector de pantalla: el nombre y la hora van en el texto de la tarjeta.
const round = (n: number) => Math.round(n * 1000) / 1000;
const GLYPH_RATIO = 0.58;
const RING_WIDTH = 2;
const RING_GAP = 2;

export function Pearl({ kind, color: own, size = 30, ring = false }: Props) {
  const color = own ?? pearlColors[kind.family ?? 'gray'];
  const pad = ring ? RING_WIDTH + RING_GAP : 0;
  const total = size + pad * 2;
  const glyphSize = size * GLYPH_RATIO;
  const offset = pad + (size - glyphSize) / 2;
  const scale = glyphSize / GLYPH_VIEWBOX;
  return (
    <Svg width={total} height={total} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {ring && <Circle cx={total / 2} cy={total / 2} r={total / 2 - RING_WIDTH / 2} fill="none" stroke={color} strokeWidth={RING_WIDTH} />}
      <Circle cx={total / 2} cy={total / 2} r={size / 2} fill={color} />
      <Path d={GLYPHS[kind.glyph]} fill={viewColors.pearlGlyph} transform={`translate(${round(offset)} ${round(offset)}) scale(${round(scale)})`} />
    </Svg>
  );
}
