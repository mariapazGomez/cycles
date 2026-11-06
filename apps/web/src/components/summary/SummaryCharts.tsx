import { useState } from "react";
import { line } from "d3-shape";
import { scaleLinear, scalePoint } from "d3-scale";
import { useElementWidth } from "../../hooks/useElementWidth";
import { formatNumber } from "../../lib/format";
import type { EffortPoint, RirBar } from "../../lib/summaryBoard";

// Gráficos del Resumen del coach (CYC-240) que no son el estrella. Se dibujan al
// ancho real del contenedor y el texto no baja de 11 px. Cada uno trae su
// «Ver como tabla»: el detalle completo y accesible.

const BRAND = "var(--color-brand)";
const GRID = "#eceef1";
const MUTED = "var(--color-ink-secondary)";
const INK = "var(--color-ink)";
const FONT = 12;

// Botón «Ver como tabla» y la tabla equivalente.
export function WithTable({ label, headers, rows, children }: { label: string; headers: string[]; rows: Array<Array<string | number>>; children: React.ReactNode }) {
  const [table, setTable] = useState(false);
  return (
    <>
      {table ? (
        <div className="table-scroll">
          <table className="data-table">
            <caption className="at-sr">{label}</caption>
            <thead>
              <tr>
                {headers.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {r.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
      <button type="button" className="sb-table-btn" aria-pressed={table} onClick={() => setTable((v) => !v)}>
        {table ? "Ver gráfico" : "Ver como tabla"}
      </button>
    </>
  );
}

// Esfuerzo de cada sesión (0 a 10): una marca por sesión; las omitidas y las pendientes dejan un hueco.
export function EffortChart({ points }: { points: EffortPoint[] }) {
  const [ref, measured] = useElementWidth<HTMLDivElement>();
  const width = Math.max(measured || 420, 240);
  const height = width < 420 ? 190 : 220;
  const m = { top: 14, right: 16, bottom: 30, left: 34 };
  const x = scalePoint<number>().domain(points.map((_, i) => i)).range([m.left, width - m.right]).padding(0.4);
  const y = scaleLinear().domain([0, 10]).range([height - m.bottom, m.top]);
  const path = line<EffortPoint & { i: number }>()
    .defined((p) => p.value !== null)
    .x((p) => x(p.i) ?? 0)
    .y((p) => y(p.value as number));
  const indexed = points.map((p, i) => ({ ...p, i }));
  return (
    <div ref={ref} style={{ width: "100%" }}>
      <svg role="img" aria-label="Esfuerzo de cada sesión, de 0 a 10" width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", maxWidth: "100%" }}>
        {[0, 2, 4, 6, 8, 10].map((t) => (
          <g key={t}>
            <line x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} stroke={GRID} />
            <text x={m.left - 8} y={y(t)} fontSize={FONT} fill={MUTED} textAnchor="end" dominantBaseline="middle">
              {t}
            </text>
          </g>
        ))}
        <path d={path(indexed) ?? ""} fill="none" stroke={BRAND} strokeWidth={2} strokeLinejoin="round" />
        {indexed.map((p) => (
          <g key={p.i}>
            <title>{`${p.label} · ${p.date}: ${p.value === null ? (p.status === "skipped" ? "omitida" : "sin registro") : `esfuerzo ${formatNumber(p.value)}`}`}</title>
            {p.value !== null && <circle cx={x(p.i)} cy={y(p.value)} r={4.5} fill={BRAND} stroke="#fff" strokeWidth={1.5} />}
            <text x={x(p.i)} y={height - 8} fontSize={FONT} fill={MUTED} textAnchor="middle">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

const TONE_COLOR = { harder: "var(--color-warn-fill)", easier: BRAND, even: "var(--color-gray-border)" } as const;

// Desvío de RIR por ejercicio: barras que parten del cero, como HTML (el texto conserva su tamaño real).
export function RirChart({ bars }: { bars: RirBar[] }) {
  const max = Math.max(2, ...bars.map((b) => Math.abs(b.deviation)));
  return (
    <div className="sb-rir" role="img" aria-label="Desvío de reps en reserva por ejercicio: positivo es más duro de lo planificado">
      <p className="sb-rir-scale">
        <span>← Más fácil</span>
        <span>Más duro →</span>
      </p>
      <ul>
        {bars.map((b) => (
          <li key={b.id}>
            <span className="sb-rir-name">{b.name}</span>
            <span className="sb-rir-track" aria-hidden="true">
              <i
                style={{
                  width: `${(Math.abs(b.deviation) / max) * 50}%`,
                  left: b.deviation >= 0 ? "50%" : `${50 - (Math.abs(b.deviation) / max) * 50}%`,
                  background: TONE_COLOR[b.tone],
                }}
              />
            </span>
            <strong style={{ color: INK }}>{b.deviation > 0 ? "+" : b.deviation < 0 ? "−" : ""}{formatNumber(Math.abs(b.deviation))}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

