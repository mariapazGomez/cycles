import React from 'react';
import { useWindowDimensions } from 'react-native';
import Svg, { G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme/colors';
import { GROUPS, axisScale, total, type Bar } from '../utils/muscleSummary';

interface Props {
  bars: Bar[];
  selected: number;
  onSelect: (index: number) => void;
  /** Ancho disponible del gráfico; por defecto, el de la pantalla menos márgenes. */
  width?: number;
}

const HEIGHT = 196;
const LEFT = 40;
const TOP = 8;
const BOTTOM = 160;

const fmt = (n: number) => Math.round(n).toLocaleString('es');

// Barras apiladas: una por día o semana, con la carga repartida por grupo
// muscular. Segmentos separados por 2 px de blanco y la punta superior
// redondeada, pegadas a la línea base; una sola escala.
export function MuscleStackChart({ bars, selected, onSelect, width }: Props) {
  const screen = useWindowDimensions().width;
  const w = width ?? screen - 32 - 28;
  const right = w - 4;
  const plotW = right - LEFT;
  const plotH = BOTTOM - TOP;
  const count = Math.max(bars.length, 1);
  const slot = plotW / count;
  const barW = Math.min(bars.length <= 4 ? 48 : 22, slot - 6);
  const { step, max } = axisScale(Math.max(0, ...bars.map(b => total(b.values))));
  const lines = Math.round(max / step);

  return (
    <Svg width={w} height={HEIGHT} accessibilityLabel="Barras apiladas con la carga por grupo muscular">
      {Array.from({ length: lines + 1 }, (_, i) => {
        const value = step * i;
        const y = BOTTOM - plotH * (value / max);
        return (
          <G key={i}>
            <Line x1={LEFT} x2={right} y1={y} y2={y} stroke={i === 0 ? '#c9ced6' : '#eef0f3'} strokeWidth={1} />
            <SvgText x={LEFT - 6} y={y + 3.5} fontSize={10} fill={colors.inkSecondary} textAnchor="end">
              {fmt(value)}
            </SvgText>
          </G>
        );
      })}

      {bars.map((bar, index) => {
        const x = LEFT + slot * index + (slot - barW) / 2;
        const isSelected = index === selected;
        const topGroup = bar.values.reduce((last, v, j) => (v > 0 ? j : last), -1);
        let acc = 0;
        return (
          <G key={bar.id} opacity={isSelected ? 1 : 0.5} onPress={() => onSelect(index)}>
            {bar.values.map((v, j) => {
              if (v <= 0) {
                return null;
              }
              const h = plotH * (v / max);
              const y0 = BOTTOM - plotH * (acc / max) - h;
              acc += v;
              if (j === topGroup) {
                const r = Math.min(4, h / 2);
                const d = `M${x} ${y0 + h}V${y0 + r}Q${x} ${y0} ${x + r} ${y0}H${x + barW - r}Q${x + barW} ${y0} ${x + barW} ${y0 + r}V${y0 + h}Z`;
                return <Path key={j} d={d} fill={GROUPS[j].color} stroke="#fff" strokeWidth={2} />;
              }
              return <Rect key={j} x={x} y={y0} width={barW} height={h} fill={GROUPS[j].color} stroke="#fff" strokeWidth={2} />;
            })}
            {/* Zona de toque más ancha que la barra. */}
            <Rect x={LEFT + slot * index} y={TOP} width={slot} height={plotH + 2} fill="transparent" />
            <SvgText
              x={x + barW / 2}
              y={176}
              fontSize={10}
              textAnchor="middle"
              fill={isSelected ? colors.ink : colors.inkSecondary}
              fontWeight={isSelected ? '700' : '400'}>
              {bar.line1}
            </SvgText>
            {bar.line2 !== '' && (
              <SvgText
                x={x + barW / 2}
                y={188}
                fontSize={10}
                textAnchor="middle"
                fill={isSelected ? colors.ink : colors.inkSecondary}
                fontWeight={isSelected ? '700' : '400'}>
                {bar.line2}
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
}
