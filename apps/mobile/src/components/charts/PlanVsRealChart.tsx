import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { bandPath, formatDelta, linePath, niceRange, scaleLinear, xPositions } from '../../utils/chartMath';

export interface PlanVsRealPoint {
  label: string; // «Sem 1»
  plan: number;
  real: number;
}

interface Props {
  title: string;
  unit?: string;
  data: PlanVsRealPoint[];
  height?: number;
}

// «Gráfico estrella» del Resumen (CYC-236 / CYC-244): lo planificado contra lo que
// cargó la atleta, con perlas, rejilla de puntos y banda entre ambas líneas.
// Todo el texto del gráfico va a 11 px o más, al tamaño real (no se escala).
const BG = '#1f2228';
const BLUE = '#3080fc';
const PLAN = '#aeb6c2';
const GRID = '#4a505b';
const TEXT = '#e6e9ee';
const FONT = 11;

export function PlanVsRealChart({ title, unit = 'kg', data, height = 190 }: Props) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

  const geometry = useMemo(() => {
    if (width === 0 || data.length === 0) {
      return null;
    }
    const box = { left: 38, right: width - 18, top: 14, bottom: height - 28 };
    const values = data.flatMap(d => [d.plan, d.real]);
    const { min, max, step } = niceRange(values);
    const y = scaleLinear([min, max], [box.bottom, box.top]);
    const xs = xPositions(data.length, box.left + 8, box.right - 4);
    const plan = data.map((d, i) => ({ x: xs[i], y: y(d.plan) }));
    const real = data.map((d, i) => ({ x: xs[i], y: y(d.real) }));
    const ticks: number[] = [];
    for (let v = min; v <= max + 1e-9; v += step) {
      ticks.push(v);
    }
    return { box, y, plan, real, ticks };
  }, [width, data, height]);

  const last = data[data.length - 1];
  const delta = last ? last.real - last.plan : 0;
  const sentence =
    Math.abs(delta) < 0.05
      ? 'Cargó lo planificado en la última sesión.'
      : `Cargó ${formatDelta(Math.abs(delta), unit).slice(1)} ${delta < 0 ? 'menos' : 'más'} que el plan en la última sesión.`;
  const description = `${title}. ${data.map(d => `${d.label}: plan ${d.plan} ${unit}, cargado ${d.real} ${unit}`).join('. ')}. ${sentence}`;

  return (
    <View style={styles.card} accessible accessibilityRole="image" accessibilityLabel={description}>
      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        {last && (
          <Text style={styles.big}>
            {String(last.real).replace('.', ',')}
            <Text style={styles.bigUnit}> {unit}</Text>
          </Text>
        )}
      </View>
      <View onLayout={onLayout} style={{ height }}>
        {geometry && (
          <Svg width={width} height={height}>
            {geometry.ticks.map(v => {
              const y = geometry.y(v);
              return (
                <G key={v}>
                  <Line x1={geometry.box.left} x2={geometry.box.right} y1={y} y2={y} stroke={GRID} strokeWidth={1.5} strokeLinecap="round" strokeDasharray="0 7" />
                  <SvgText x={geometry.box.left - 8} y={y + 4} fontSize={FONT} fill={TEXT} textAnchor="end">
                    {String(v).replace('.', ',')}
                  </SvgText>
                </G>
              );
            })}
            <Path d={bandPath(geometry.real, geometry.plan)} fill={BLUE} fillOpacity={0.18} />
            <Path d={linePath(geometry.plan)} stroke={PLAN} strokeWidth={2} strokeDasharray="2 6" strokeLinecap="round" fill="none" />
            <Path d={linePath(geometry.real)} stroke={BLUE} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" fill="none" />
            {geometry.plan.map((p, i) => (
              <Circle key={`p${i}`} cx={p.x} cy={p.y} r={4} fill={BG} stroke={PLAN} strokeWidth={2} />
            ))}
            {geometry.real.map((p, i) => {
              const isLast = i === geometry.real.length - 1;
              const r = isLast ? 7 : 5;
              return (
                <G key={`r${i}`}>
                  <Circle cx={p.x} cy={p.y} r={r + 4} fill={BLUE} fillOpacity={0.16} />
                  <Circle cx={p.x} cy={p.y} r={r} fill={BLUE} stroke="#ffffff" strokeWidth={2.5} />
                </G>
              );
            })}
            {data.map((d, i) => (
              <SvgText key={d.label} x={geometry.real[i].x} y={height - 8} fontSize={FONT} fill={TEXT} textAnchor="middle">
                {d.label}
              </SvgText>
            ))}
          </Svg>
        )}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: BLUE }]} />
          <Text style={styles.legendText}>Cargado</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, styles.swatchPlan]} />
          <Text style={styles.legendText}>Planificado</Text>
        </View>
      </View>
      <Text style={styles.sentence}>{sentence}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: BG, borderRadius: 24, padding: 18 },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 },
  title: { color: TEXT, fontSize: 15, fontWeight: '600', flexShrink: 1 },
  big: { color: '#ffffff', fontSize: 28, fontWeight: '800' },
  bigUnit: { fontSize: 15, fontWeight: '600', color: TEXT },
  legend: { flexDirection: 'row', gap: 16, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 14, height: 4, borderRadius: 2 },
  swatchPlan: { backgroundColor: PLAN, opacity: 0.9 },
  legendText: { color: TEXT, fontSize: FONT },
  sentence: { color: '#ffffff', fontSize: 14, marginTop: 10 },
});
