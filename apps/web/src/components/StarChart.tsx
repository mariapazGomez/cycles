import { useElementWidth } from "../hooks/useElementWidth";
import { MIN_WIDTH, buildStarLayout, lastDeltaLabel, lastSessionPhrase, type StarPoint, type StarUnit } from "../lib/starChart";

// Gráfico estrella del Resumen (spike CYC-243): tarjeta oscura con el peso
// planificado (gris, discontinuo, marcas huecas) contra el cargado (azul,
// continuo, marcas llenas) y la banda entre ambos. Se dibuja al ancho real del
// contenedor para que el texto no se achique (mínimo 11 px, nunca solo color:
// forma de la marca, trazo y signo).
const INK = "#1f2228";
const REAL = "#3080fc";
const PLAN = "#c9cfd9";
const GRID = "rgba(255, 255, 255, 0.1)";
const TEXT = "#aab0bb";
const FONT = 12;

export function StarChart({ title, points, unit = "kg" }: { title: string; points: StarPoint[]; unit?: StarUnit }) {
  const [ref, width] = useElementWidth<HTMLElement>();
  const height = width > 0 && width < 420 ? 200 : 240;
  // El gráfico mide lo que cabe dentro del relleno de la tarjeta (16 px por lado):
  // así se dibuja a escala 1 a 1 y el texto no se achica.
  const layout = buildStarLayout(points, (width || 512) - 32, height);
  const delta = lastDeltaLabel(points, unit);
  const phrase = lastSessionPhrase(points, unit);
  const description = `${title}. ${phrase}`;

  return (
    <section className="star-card" aria-label={title} ref={ref} style={{ background: INK, color: "#ffffff", borderRadius: 10, padding: 16, minWidth: MIN_WIDTH }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h3>
        <strong style={{ fontSize: 28, lineHeight: 1 }} data-tone={delta.tone}>
          {delta.text}
        </strong>
      </header>
      <svg role="img" aria-label={description} width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`} style={{ display: "block", maxWidth: "100%", marginTop: 8 }}>
        {layout.yTicks.map((tick) => (
          <g key={tick}>
            <line x1={layout.margin.left} x2={layout.width - layout.margin.right} y1={layout.y(tick)} y2={layout.y(tick)} stroke={GRID} />
            <text x={layout.margin.left - 8} y={layout.y(tick)} fill={TEXT} fontSize={FONT} textAnchor="end" dominantBaseline="middle">
              {tick}
            </text>
          </g>
        ))}
        <path d={layout.bandPath} fill={REAL} fillOpacity={0.18} />
        <path d={layout.plannedPath} fill="none" stroke={PLAN} strokeWidth={2} strokeDasharray="5 4" />
        <path d={layout.actualPath} fill="none" stroke={REAL} strokeWidth={2} strokeLinejoin="round" />
        {layout.points.map((p, i) => (
          <g key={i}>
            <title>{`${points[i].label} · ${points[i].date}: plan ${p.planned ?? "—"} ${unit === "kg" ? "kg" : "rep"}, ${unit === "kg" ? "cargado" : "hecho"} ${p.actual ?? "—"} ${unit === "kg" ? "kg" : "rep"}`}</title>
            {p.plannedY !== null && <circle cx={p.x} cy={p.plannedY} r={4} fill={INK} stroke={PLAN} strokeWidth={2} />}
            {p.actualY !== null && <circle cx={p.x} cy={p.actualY} r={4.5} fill={REAL} stroke={INK} strokeWidth={1.5} />}
            <text x={p.x} y={layout.height - 10} fill={TEXT} fontSize={FONT} textAnchor="middle">
              {points[i].label}
            </text>
          </g>
        ))}
      </svg>
      <ul style={{ display: "flex", gap: 16, margin: "8px 0 0", padding: 0, listStyle: "none", fontSize: FONT, flexWrap: "wrap" }}>
        <li>
          <span aria-hidden="true" style={{ color: PLAN }}>
            ┅ ○
          </span>{" "}
          Planificado
        </li>
        <li>
          <span aria-hidden="true" style={{ color: REAL }}>
            ━ ●
          </span>{" "}
          {unit === "kg" ? "Cargado por el atleta" : "Hecho por el atleta"}
        </li>
      </ul>
      <p style={{ margin: "8px 0 0", fontSize: 14 }}>{phrase}</p>
    </section>
  );
}
