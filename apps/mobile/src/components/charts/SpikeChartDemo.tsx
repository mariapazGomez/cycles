import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PlanVsRealChart, type PlanVsRealPoint } from './PlanVsRealChart';

// SOLO PARA EL SPIKE CYC-244 (no se mezcla): datos de ejemplo y una prueba de
// fluidez que redibuja el gráfico en cada cuadro durante 3 segundos.
const SAMPLE: PlanVsRealPoint[] = [
  { label: 'Sem 1', plan: 60, real: 60 },
  { label: 'Sem 2', plan: 62.5, real: 62.5 },
  { label: 'Sem 3', plan: 65, real: 62.5 },
  { label: 'Sem 4', plan: 67.5, real: 65 },
  { label: 'Sem 5', plan: 70, real: 67.5 },
  { label: 'Sem 6', plan: 72.5, real: 70 },
];

const make = (n: number, phase = 0): PlanVsRealPoint[] =>
  Array.from({ length: n }, (_, i) => ({
    label: `S${i + 1}`,
    plan: 60 + i * (12 / Math.max(n - 1, 1)),
    real: 60 + i * (10 / Math.max(n - 1, 1)) + Math.sin(i + phase) * 1.5,
  }));

interface Result {
  fps: number;
  worst: number;
  slow: number;
  frames: number;
}

export function SpikeChartDemo() {
  const [points, setPoints] = useState(6);
  const [data, setData] = useState<PlanVsRealPoint[]>(SAMPLE);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const raf = useRef<number | null>(null);

  const choose = (n: number) => {
    setPoints(n);
    setData(n === 6 ? SAMPLE : make(n));
    setResult(null);
  };

  const run = useCallback(() => {
    if (running) {
      return;
    }
    setRunning(true);
    setResult(null);
    const deltas: number[] = [];
    const start = Date.now();
    let prev = start;
    let frame = 0;
    const tick = () => {
      const now = Date.now();
      deltas.push(now - prev);
      prev = now;
      frame += 1;
      setData(make(points, frame / 6));
      if (now - start < 3000) {
        raf.current = requestAnimationFrame(tick);
      } else {
        const total = now - start;
        setResult({
          fps: Math.round((deltas.length / total) * 1000),
          worst: Math.max(...deltas),
          slow: deltas.filter(d => d > 20).length,
          frames: deltas.length,
        });
        setData(points === 6 ? SAMPLE : make(points));
        setRunning(false);
      }
    };
    raf.current = requestAnimationFrame(tick);
  }, [points, running]);

  return (
    <View style={styles.wrap}>
      <PlanVsRealChart title="Sentadilla · peso" data={data} />
      <View style={styles.row}>
        {[6, 12, 40].map(n => (
          <TouchableOpacity key={n} style={[styles.chip, points === n && styles.chipOn]} onPress={() => choose(n)} accessibilityRole="button">
            <Text style={[styles.chipText, points === n && styles.chipTextOn]}>{n} sesiones</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.run} onPress={run} disabled={running} accessibilityRole="button">
        <Text style={styles.runText}>{running ? 'Midiendo…' : 'Prueba de fluidez (3 s)'}</Text>
      </TouchableOpacity>
      {result && (
        <Text style={styles.result}>
          {result.fps} cuadros/s · peor cuadro {result.worst} ms · {result.slow} de {result.frames} sobre 20 ms
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  row: { flexDirection: 'row', gap: 8, marginTop: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#747775' },
  chipOn: { backgroundColor: '#1f2228', borderColor: '#1f2228' },
  chipText: { color: '#1f2228', fontSize: 13 },
  chipTextOn: { color: '#ffffff' },
  run: { marginTop: 10, minHeight: 44, borderRadius: 999, backgroundColor: '#3080fc', alignItems: 'center', justifyContent: 'center' },
  runText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  result: { marginTop: 8, color: '#1f2228', fontSize: 13 },
});
