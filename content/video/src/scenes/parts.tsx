import React from "react";
import { BLUE, WHITE, MUTED, display, text } from "../theme";

// Perla: el motivo de la marca (cadena de perlas azules).
export const Bead: React.FC<{ x: number; y: number; r: number; o?: number }> = ({ x, y, r, o = 1 }) => (
  <circle cx={x} cy={y} r={r} fill={BLUE} fillOpacity={o} />
);

// Cadena de perlas entre dos puntos; `p` (0 a 1) cuánto de la cadena se ve.
export const Chain: React.FC<{ x1: number; y1: number; x2: number; y2: number; p: number; n?: number }> = ({ x1, y1, x2, y2, p, n = 9 }) => (
  <g>
    {Array.from({ length: n }, (_, i) => {
      const f = (i + 1) / (n + 1);
      const k = Math.max(0, Math.min(1, p * (n + 1) - i));
      const r = 5 + 3 * Math.abs(Math.sin(i * 0.9));
      return <Bead key={i} x={x1 + (x2 - x1) * f} y={y1 + (y2 - y1) * f} r={r * k} o={i % 2 ? 0.55 : 0.95} />;
    })}
  </g>
);

export const Label: React.FC<{ x: number; y: number; size?: number; weight?: 600 | 700 | 800; fill?: string; o?: number; font?: "d" | "t"; children: React.ReactNode }> = ({
  x, y, size = 30, weight = 700, fill = WHITE, o = 1, font = "t", children,
}) => (
  <text x={x} y={y} textAnchor="middle" fontFamily={font === "d" ? display : text} fontWeight={weight} fontSize={size} fill={fill} opacity={o}>
    {children}
  </text>
);

export const Node: React.FC<{ x: number; y: number; r: number; s: number; solid?: boolean; ring?: number; o?: number }> = ({ x, y, r, s, solid, ring = 0, o = 1 }) => (
  <g opacity={o}>
    {ring > 0 && <circle cx={x} cy={y} r={r + 10 + 14 * ring} fill={BLUE} fillOpacity={0.28 * (1 - ring)} />}
    <circle cx={x} cy={y} r={r * s} fill={solid ? BLUE : "#1f2228"} stroke={BLUE} strokeWidth={5} />
  </g>
);

// Isotipo: anillo azul abierto en dos arcos.
export const Isotipo: React.FC<{ x: number; y: number; r: number; w: number; rot?: number }> = ({ x, y, r, w, rot = 0 }) => {
  const c = 2 * Math.PI * r;
  return (
    <circle
      cx={x} cy={y} r={r} fill="none" stroke={BLUE} strokeWidth={w} strokeLinecap="round"
      strokeDasharray={`${c * 0.43} ${c * 0.07}`} transform={`rotate(${rot} ${x} ${y})`}
    />
  );
};
export { MUTED };
