import type { NoveltySlide } from "@cycles/shared";

// Demostraciones animadas dibujadas en código (SVG + CSS), con el aspecto de la interfaz.
// El estado base de cada dibujo es el RESULTADO FINAL: la animación parte de otro estado y
// llega a él, así que con «reducir movimiento» (animation: none) queda la imagen fija final.
const AMBER = "#e8a317";
const PINK = "#d9588f";
const GREEN = "#2f9e5f";

function Row({ x, y, w = 150, className, dy }: { x: number; y: number; w?: number; className?: string; dy?: number }) {
  return (
    <g className={`nd-row ${className ?? ""}`} style={dy === undefined ? undefined : ({ "--dy": `${dy}px` } as React.CSSProperties)}>
      <rect x={x} y={y} width={w} height={20} rx={5} className="nd-row-bg" />
      <rect x={x + 8} y={y + 7} width={w * 0.5} height={6} rx={3} className="nd-ink" />
      <rect x={x + w - 34} y={y + 7} width={26} height={6} rx={3} className="nd-ink-soft" />
    </g>
  );
}

function Block({ x, y, color, label, rows, className }: { x: number; y: number; color: string; label: string; rows: number; className?: string }) {
  return (
    <g className={`nd-block ${className ?? ""}`}>
      <rect x={x} y={y} width={170} height={26 + rows * 26} rx={9} className="nd-block-bg" />
      <rect x={x} y={y} width={5} height={26 + rows * 26} rx={2.5} fill={color} />
      <circle cx={x + 17} cy={y + 13} r={4.5} fill={color} />
      <text x={x + 28} y={y + 17} className="nd-label">
        {label}
      </text>
    </g>
  );
}

function Group() {
  return (
    <svg viewBox="0 0 320 180" className="nd nd-group" aria-hidden="true">
      <Block x={20} y={10} color={AMBER} label="Calentamiento" rows={1} className="nd-b1" />
      <Block x={20} y={66} color={PINK} label="Pliometría" rows={1} className="nd-b2" />
      <Block x={20} y={122} color={GREEN} label="Fuerza" rows={1} className="nd-b3" />
      <Row x={30} y={38} w={150} className="nd-r1" dy={-20} />
      <Row x={30} y={94} w={150} className="nd-r2" dy={-50} />
      <Row x={30} y={150} w={150} className="nd-r3" dy={-84} />
      <g className="nd-note">
        <rect x={208} y={60} width={92} height={46} rx={8} className="nd-chip" />
        <text x={254} y={80} textAnchor="middle" className="nd-label">
          Cada bloque
        </text>
        <text x={254} y={95} textAnchor="middle" className="nd-label">
          con su color
        </text>
      </g>
    </svg>
  );
}

function Move() {
  return (
    <svg viewBox="0 0 320 180" className="nd nd-move" aria-hidden="true">
      <Block x={20} y={14} color={PINK} label="Pliometría" rows={2} />
      <Block x={20} y={96} color={GREEN} label="Fuerza" rows={2} />
      <Row x={30} y={40} className="nd-r-fixed" />
      <Row x={30} y={66} className="nd-mover" dy={82} />
      <Row x={30} y={122} className="nd-r-fixed" />
      <Row x={30} y={148} className="nd-r-fixed" />
      <g className="nd-menu">
        <rect x={196} y={46} width={108} height={52} rx={9} className="nd-chip" />
        <text x={206} y={64} className="nd-label">
          ⋯
        </text>
        <text x={206} y={82} className="nd-label">
          Mover a otro bloque
        </text>
      </g>
    </svg>
  );
}

function Legacy() {
  return (
    <svg viewBox="0 0 320 180" className="nd nd-legacy" aria-hidden="true">
      <Block x={20} y={44} color={GREEN} label="Fuerza" rows={3} className="nd-header" />
      <Row x={30} y={70} />
      <Row x={30} y={96} />
      <Row x={30} y={122} />
      <g className="nd-btn">
        <rect x={204} y={64} width={100} height={30} rx={8} className="nd-primary" />
        <text x={254} y={83} textAnchor="middle" className="nd-btn-label">
          Agrupar en bloques
        </text>
      </g>
      <text x={254} y={118} textAnchor="middle" className="nd-label nd-hint">
        Rutinas sin bloque
      </text>
    </svg>
  );
}

function Page() {
  return (
    <svg viewBox="0 0 320 180" className="nd nd-page" aria-hidden="true">
      <rect x={10} y={10} width={300} height={160} rx={10} className="nd-block-bg" />
      <g className="nd-before">
        <Row x={26} y={36} w={190} />
        <Row x={26} y={62} w={190} />
        <g className="nd-btn">
          <rect x={232} y={30} width={62} height={26} rx={7} className="nd-primary" />
          <text x={263} y={47} textAnchor="middle" className="nd-btn-label">
            Editar
          </text>
        </g>
      </g>
      <g className="nd-after">
        <Block x={22} y={24} color={AMBER} label="Calentamiento" rows={1} />
        <Block x={22} y={82} color={GREEN} label="Fuerza" rows={2} />
        <Row x={32} y={50} w={150} />
        <Row x={32} y={108} w={150} />
        <Row x={32} y={134} w={150} />
        <rect x={214} y={24} width={86} height={120} rx={9} className="nd-chip" />
        <rect x={224} y={36} width={66} height={7} rx={3} className="nd-ink" />
        <rect x={224} y={52} width={50} height={6} rx={3} className="nd-ink-soft" />
        <rect x={224} y={118} width={66} height={18} rx={6} className="nd-primary" />
      </g>
    </svg>
  );
}

export function NoveltyDemo({ slide }: { slide: NoveltySlide }) {
  if (slide.video) {
    return (
      <div className="nd-frame" role="img" aria-label={slide.demoLabel}>
        <video className="nd-video" src={slide.video} poster={slide.poster} autoPlay loop muted playsInline />
      </div>
    );
  }
  const art = slide.demo === "blocks-group" ? <Group /> : slide.demo === "blocks-move" ? <Move /> : slide.demo === "blocks-legacy" ? <Legacy /> : slide.demo === "blocks-page" ? <Page /> : null;
  return (
    <div className="nd-frame" role="img" aria-label={slide.demoLabel}>
      {art}
    </div>
  );
}
