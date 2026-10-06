// Anillo del ciclo de entrenamiento: cuatro pasos unidos por perlas (el motivo
// de la marca, que recuerda al isotipo del loop) y un punto que lo recorre.
const CENTER = 180;
const RADIUS = 130;
const BEAD_COUNT = 56;
const NODES: Array<[number, number, string]> = [
  [180, 50, "1"],
  [310, 180, "2"],
  [180, 310, "3"],
  [50, 180, "4"],
];

const BEADS = Array.from({ length: BEAD_COUNT }, (_, k) => {
  const angle = (2 * Math.PI * k) / BEAD_COUNT - Math.PI / 2;
  return {
    x: CENTER + RADIUS * Math.cos(angle),
    y: CENTER + RADIUS * Math.sin(angle),
    r: 3 + 4 * Math.abs(Math.sin(k * 0.9)),
    o: k % 2 === 0 ? 0.9 : 0.5,
  };
});

export function CycleRing() {
  return (
    <svg
      className="lp-ring"
      viewBox="0 0 360 360"
      role="img"
      aria-label="Ciclo de entrenamiento en cuatro pasos: diseñar, entrenar, ver qué pasó y ajustar para el siguiente ciclo"
    >
      <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="#3080fc" strokeOpacity=".28" strokeWidth="2.4" />
      {BEADS.map((b, i) => (
        <circle key={i} cx={b.x.toFixed(1)} cy={b.y.toFixed(1)} r={b.r.toFixed(1)} fill="#3080fc" fillOpacity={b.o} />
      ))}
      <g className="lp-orbit">
        <circle cx="180" cy="50" r="12" fill="#3080fc" />
        <circle cx="180" cy="50" r="20" fill="#3080fc" fillOpacity=".25" />
      </g>
      {NODES.map(([x, y, n]) => (
        <g key={n}>
          <circle cx={x} cy={y} r="24" fill="#fff" stroke="#3080fc" strokeWidth="3" />
          <text x={x} y={y + 7} textAnchor="middle" fontFamily="Bricolage Grotesque, Inter, sans-serif" fontWeight="800" fontSize="22" fill="#1450b0">
            {n}
          </text>
        </g>
      ))}
      <text x="180" y="176" textAnchor="middle" fontFamily="Bricolage Grotesque, Inter, sans-serif" fontWeight="800" fontSize="30" fill="#1f2228">
        Tu ciclo
      </text>
      <text x="180" y="204" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="600" fontSize="15" fill="#5c6068">
        de entrenamiento
      </text>
    </svg>
  );
}
