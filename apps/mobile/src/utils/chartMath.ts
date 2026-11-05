// Matemática mínima de gráficos de líneas (spike CYC-244): sin d3, sin dependencias.
export interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface Point {
  x: number;
  y: number;
}

// Rango «bonito» del eje Y que incluye todos los valores, con un margen.
export function niceRange(values: number[], ticks = 3): { min: number; max: number; step: number } {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = Math.max(hi - lo, 1);
  const rough = span / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = [1, 2, 2.5, 5, 10].map(f => f * mag).find(s => s >= rough) ?? 10 * mag;
  const min = Math.floor(lo / step) * step - (lo === hi ? step : 0);
  const max = Math.ceil(hi / step) * step + (lo === hi ? step : 0);
  return { min, max: max === min ? min + step : max, step };
}

export function scaleLinear(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (value: number) => r0 + (value - d0) * k;
}

// Una posición X por sesión, repartidas sin dejar huecos en los bordes.
export function xPositions(count: number, left: number, right: number): number[] {
  if (count <= 1) {
    return [(left + right) / 2];
  }
  return Array.from({ length: count }, (_, i) => left + ((right - left) * i) / (count - 1));
}

export const linePath = (points: Point[]) =>
  points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

// Banda cerrada entre dos líneas con las mismas X (la variación hecha visible).
export function bandPath(upper: Point[], lower: Point[]): string {
  if (upper.length === 0) {
    return '';
  }
  const back = [...lower].reverse();
  return `${linePath(upper)} ${back.map(p => `L${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')} Z`;
}

// «−2,5 kg» / «+10 kg» / «0 kg», con coma decimal y signo menos tipográfico.
export function formatDelta(value: number, unit: string): string {
  const abs = Math.abs(value);
  const text = (Math.round(abs * 10) / 10).toString().replace('.', ',');
  if (abs < 0.05) {
    return `0 ${unit}`;
  }
  return `${value < 0 ? '−' : '+'}${text} ${unit}`;
}
