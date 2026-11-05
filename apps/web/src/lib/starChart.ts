import { area, line } from "d3-shape";
import { scaleLinear, scalePoint } from "d3-scale";

// Gráfico estrella del Resumen (spike CYC-243, diseño docs/diseno/resumen-atleta):
// peso planificado contra el cargado por el atleta, una marca por sesión. Aquí
// vive la matemática (escalas y trazados con d3); el dibujo está en
// components/StarChart.tsx. Funciones puras, sin DOM.

export interface StarPoint {
  // Etiqueta corta del eje X («Sem 1», «Sem 2»…).
  label: string;
  // Fecha de la sesión (para el tooltip).
  date: string;
  // Peso planificado y cargado, en kg; null si no hay (peso corporal o aún sin hacer).
  planned: number | null;
  actual: number | null;
}

export interface StarLayout {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  x: (index: number) => number;
  y: (value: number) => number;
  yTicks: number[];
  plannedPath: string;
  actualPath: string;
  // Banda entre lo planificado y lo cargado, solo donde hay ambos.
  bandPath: string;
  points: Array<{ x: number; planned: number | null; actual: number | null; plannedY: number | null; actualY: number | null }>;
}

export const MIN_WIDTH = 240;

export function buildStarLayout(points: StarPoint[], width: number, height: number): StarLayout {
  const w = Math.max(width, MIN_WIDTH);
  const margin = { top: 16, right: 20, bottom: 34, left: 44 };
  const values = points.flatMap((p) => [p.planned, p.actual]).filter((v): v is number => v !== null);
  const lo = values.length > 0 ? Math.min(...values) : 0;
  const hi = values.length > 0 ? Math.max(...values) : 1;
  const pad = Math.max((hi - lo) * 0.2, 2.5);
  const yScale = scaleLinear()
    .domain([Math.max(0, lo - pad), hi + pad])
    .nice(4)
    .range([height - margin.bottom, margin.top]);
  const xScale = scalePoint<number>()
    .domain(points.map((_, i) => i))
    .range([margin.left, w - margin.right])
    .padding(0.3);

  const x = (index: number) => xScale(index) ?? margin.left;
  const y = (value: number) => yScale(value);

  const plannedLine = line<StarPoint & { i: number }>()
    .defined((p) => p.planned !== null)
    .x((p) => x(p.i))
    .y((p) => y(p.planned as number));
  const actualLine = line<StarPoint & { i: number }>()
    .defined((p) => p.actual !== null)
    .x((p) => x(p.i))
    .y((p) => y(p.actual as number));
  const band = area<StarPoint & { i: number }>()
    .defined((p) => p.planned !== null && p.actual !== null)
    .x((p) => x(p.i))
    .y0((p) => y(p.planned as number))
    .y1((p) => y(p.actual as number));
  const indexed = points.map((p, i) => ({ ...p, i }));

  return {
    width: w,
    height,
    margin,
    x,
    y,
    yTicks: yScale.ticks(4),
    plannedPath: plannedLine(indexed) ?? "",
    actualPath: actualLine(indexed) ?? "",
    bandPath: band(indexed) ?? "",
    points: indexed.map((p) => ({
      x: x(p.i),
      planned: p.planned,
      actual: p.actual,
      plannedY: p.planned === null ? null : y(p.planned),
      actualY: p.actual === null ? null : y(p.actual),
    })),
  };
}

export type StarUnit = "kg" | "reps";

const amount = (n: number, unit: StarUnit) => {
  const value = Math.abs(n).toLocaleString("es", { maximumFractionDigits: 1 });
  return unit === "kg" ? `${value} kg` : `${value} ${Math.abs(n) === 1 ? "repetición" : "repeticiones"}`;
};
const shortAmount = (n: number, unit: StarUnit) => `${Math.abs(n).toLocaleString("es", { maximumFractionDigits: 1 })} ${unit === "kg" ? "kg" : "rep"}`;

// Frase bajo el gráfico: «Cargó 2,5 kg menos que el plan en la última sesión.»
export function lastSessionPhrase(points: StarPoint[], unit: StarUnit = "kg"): string {
  const last = [...points].reverse().find((p) => p.planned !== null && p.actual !== null);
  if (!last) return unit === "kg" ? "Todavía no hay una sesión con peso planificado y cargado." : "Todavía no hay una sesión con repeticiones planificadas y hechas.";
  const diff = (last.actual as number) - (last.planned as number);
  const verb = unit === "kg" ? "Cargó" : "Hizo";
  if (Math.abs(diff) < 0.05) return `${verb} lo mismo que el plan en la última sesión.`;
  return `${verb} ${amount(diff, unit)} ${diff < 0 ? "menos" : "más"} que el plan en la última sesión.`;
}

// Etiqueta corta de la diferencia («−2,5 kg», «+2,5 kg», «= plan»).
export function lastDeltaLabel(points: StarPoint[], unit: StarUnit = "kg"): { text: string; tone: "below" | "above" | "equal" } {
  const last = [...points].reverse().find((p) => p.planned !== null && p.actual !== null);
  if (!last) return { text: "Sin datos", tone: "equal" };
  const diff = (last.actual as number) - (last.planned as number);
  if (Math.abs(diff) < 0.05) return { text: "= plan", tone: "equal" };
  const sign = diff < 0 ? "−" : "+";
  return { text: `${sign}${shortAmount(diff, unit)}`, tone: diff < 0 ? "below" : "above" };
}
