import { formatInteger, formatShortDate } from "../lib/format";

// Gráficos del resumen del atleta. SVG a mano, sin librería: son pocos y
// simples. Marcas finas, barras de 24px con punta redondeada, grilla tenue,
// etiquetas solo donde aportan y un <title> por marca como tooltip.

const BRAND = "var(--color-brand)";
const BRAND_LIGHT = "#9fc3fd";
const SKIPPED = "var(--color-warn-fill)";
const PENDING = "var(--color-gray-border)";
const GRID = "#eceef1";
const MUTED = "var(--color-ink-secondary)";
const INK = "var(--color-ink)";

function niceMax(value: number, step: number): number {
  return Math.max(step, Math.ceil(value / step) * step);
}

// Barra con la punta redondeada y la base recta.
function barPath(x: number, width: number, top: number, bottom: number): string {
  const r = Math.min(4, (bottom - top) / 2);
  return `M${x},${bottom} V${top + r} Q${x},${top} ${x + r},${top} H${x + width - r} Q${x + width},${top} ${x + width},${top + r} V${bottom} Z`;
}

interface Week {
  weekStart: string;
  assigned: number;
  completed: number;
  skipped: number;
  load: number;
}

export function WeeklyLoadChart({ weeks }: { weeks: Week[] }) {
  const W = 440;
  const H = 220;
  const left = 48;
  const bottom = 28;
  const top = 20;
  const plotH = H - bottom - top;
  const max = niceMax(Math.max(...weeks.map((w) => w.load), 1), 1000);
  const ticks = Array.from({ length: max / 1000 + 1 }, (_, i) => i * 1000);
  const step = (W - left) / weeks.length;
  const y = (v: number) => top + plotH - (v / max) * plotH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Carga semanal de las últimas semanas">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={left} x2={W} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
          <text x={left - 8} y={y(t) + 4} textAnchor="end" fontSize={13} fill={MUTED}>
            {formatInteger(t)}
          </text>
        </g>
      ))}
      {weeks.map((w, i) => {
        const current = i === weeks.length - 1;
        const cx = left + step * i + step / 2;
        const labelled = i >= weeks.length - 2 && w.load > 0;
        return (
          <g key={w.weekStart}>
            {w.load > 0 && (
              <path d={barPath(cx - 12, 24, y(w.load), top + plotH)} fill={current ? BRAND_LIGHT : BRAND}>
                <title>{`Semana del ${formatShortDate(w.weekStart)}: ${formatInteger(w.load)}${current ? " (en curso)" : ""}`}</title>
              </path>
            )}
            {labelled && (
              <text x={cx} y={y(w.load) - 8} textAnchor="middle" fontSize={13} fontWeight={600} fill={INK}>
                {formatInteger(w.load)}
                {current ? " · en curso" : ""}
              </text>
            )}
            <text x={cx} y={H - 8} textAnchor="middle" fontSize={13} fill={MUTED}>
              {formatShortDate(w.weekStart)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function AdherenceChart({ weeks }: { weeks: Week[] }) {
  const W = 440;
  const H = 220;
  const left = 32;
  const bottom = 28;
  const top = 12;
  const plotH = H - bottom - top;
  const max = Math.max(3, ...weeks.map((w) => w.assigned));
  const unit = plotH / max;
  const step = (W - left) / weeks.length;
  const ticks = Array.from({ length: max + 1 }, (_, i) => i).filter((t) => max <= 6 || t % 2 === 0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Sesiones por semana: completadas, omitidas y pendientes">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={left} x2={W} y1={top + plotH - t * unit} y2={top + plotH - t * unit} stroke={GRID} strokeWidth={1} />
          <text x={left - 8} y={top + plotH - t * unit + 4} textAnchor="end" fontSize={13} fill={MUTED}>
            {t}
          </text>
        </g>
      ))}
      {weeks.map((w, i) => {
        const cx = left + step * i + step / 2;
        const pending = Math.max(0, w.assigned - w.completed - w.skipped);
        let base = top + plotH;
        const segments = [
          { n: w.completed, fill: BRAND, label: "completadas" },
          { n: w.skipped, fill: SKIPPED, label: "omitidas" },
          { n: pending, fill: PENDING, label: "pendientes" },
        ].filter((s) => s.n > 0);
        return (
          <g key={w.weekStart}>
            {segments.map((s) => {
              const h = s.n * unit - 2;
              const rect = (
                <rect key={s.label} x={cx - 12} y={base - h} width={24} height={h} rx={3} fill={s.fill}>
                  <title>{`Semana del ${formatShortDate(w.weekStart)}: ${s.n} ${s.label}`}</title>
                </rect>
              );
              base -= s.n * unit;
              return rect;
            })}
            <text x={cx} y={H - 8} textAnchor="middle" fontSize={13} fill={MUTED}>
              {formatShortDate(w.weekStart)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function AdherenceLegend() {
  return (
    <div className="legend">
      <span>
        <i style={{ background: BRAND }} />
        Completadas
      </span>
      <span>
        <i style={{ background: SKIPPED }} />
        Omitidas
      </span>
      <span>
        <i style={{ background: PENDING }} />
        Pendientes
      </span>
    </div>
  );
}

export function Sparkline({ values, label }: { values: number[]; label: string }) {
  const W = 120;
  const H = 32;
  if (values.length === 0) return null;
  const lo = Math.min(...values) - 2;
  const hi = Math.max(...values) + 2;
  const xs = values.map((_, i) => (values.length === 1 ? W / 2 : 4 + (i * (W - 12)) / (values.length - 1)));
  const ys = values.map((v) => H - 4 - ((v - lo) / (hi - lo)) * (H - 8));
  const last = values.length - 1;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {values.length > 1 && (
        <polyline
          points={xs.map((x, i) => `${x},${ys[i]}`).join(" ")}
          fill="none"
          stroke={BRAND}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      <circle cx={xs[last]} cy={ys[last]} r={4} fill={BRAND} stroke="#ffffff" strokeWidth={2} />
    </svg>
  );
}
