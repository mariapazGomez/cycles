import type { CSSProperties } from "react";
import type { NoveltySlide } from "@cycles/shared";
import { useElementWidth } from "../../hooks/useElementWidth";

// Demostraciones animadas dibujadas en código con el aspecto de la interfaz, tal como las
// define la maqueta aprobada (docs/diseno/guia-novedades-bloques/propuestas.html): un
// escenario fijo de 648 × 292 que se escala al ancho real del popup, así nada se desborda.
// El estado base de cada dibujo es el RESULTADO FINAL: la animación parte de otro estado y
// llega a él, así que con «reducir movimiento» (animation: none) queda la imagen final.
const STAGE_W = 648;
const STAGE_H = 292;
const AMBER = "#e8a317";
const PINK = "#d9588f";
const GREEN = "#2f9e5f";

function Block({ color, name, sub, rows, top, className, blank }: { color: string; name: string; sub: string; rows: [string, string][]; top: number; className?: string; blank?: number }) {
  return (
    <div className={`nd-bk ${className ?? ""}`} style={{ "--c": color, top } as CSSProperties}>
      <div className="nd-h">
        <span className="nd-pl" />
        {name}
        <small>{sub}</small>
      </div>
      {rows.map(([n, s], i) =>
        blank === i ? (
          <div className="nd-e nd-blank" key={n} />
        ) : (
          <div className="nd-e" key={n}>
            {n}
            <small>{s}</small>
          </div>
        ),
      )}
    </div>
  );
}

function Row({ name, serie, top, className, style }: { name: string; serie: string; top: number; className?: string; style?: CSSProperties }) {
  return (
    <div className={`nd-rw ${className ?? ""}`} style={{ top, ...style }}>
      {name}
      <small>{serie}</small>
    </div>
  );
}

const FLAT: [string, string][] = [
  ["Movilidad de cadera", "2 × 10"],
  ["Salto al cajón", "3 × 8"],
  ["Sentadilla con barra", "3 × 8"],
  ["Flexiones de brazos", "3 × 15"],
];

function Group() {
  return (
    <div className="nd nd-d1">
      <div className="nd-flat">
        {FLAT.map(([n, s], i) => (
          <Row key={n} name={n} serie={s} top={22 + i * 46} />
        ))}
      </div>
      <Block color={AMBER} name="Calentamiento" sub="1 ejercicio" rows={[FLAT[0]]} top={22} className="nd-b1" />
      <Block color={PINK} name="Pliometría" sub="1 ejercicio" rows={[FLAT[1]]} top={104} className="nd-b2" />
      <Block color={GREEN} name="Fuerza" sub="2 ejercicios" rows={[FLAT[2], FLAT[3]]} top={186} className="nd-b3" />
    </div>
  );
}

function Move() {
  return (
    <div className="nd nd-d2">
      <Block color={PINK} name="Pliometría" sub="2 ejercicios" rows={[["Salto lateral", "3 × 5"], ["Salto al cajón", "3 × 8"]]} top={16} className="nd-b1" blank={1} />
      <Block color={GREEN} name="Fuerza" sub="1 ejercicio" rows={[["Sentadilla con barra", "3 × 8"]]} top={132} className="nd-b2" />
      <div className="nd-gap" />
      <div className="nd-mv">
        Salto al cajón<small>3 × 8</small>
      </div>
      <div className="nd-chip">O usa ⋯ › Mover a otro bloque</div>
    </div>
  );
}

function Legacy() {
  return (
    <div className="nd nd-d3">
      <div className="nd-old">
        <Row name="Fuerza torso" serie="6 ejercicios sueltos" top={0} style={{ left: 0, right: 0 }} />
        {[1, 2, 3].map((i) => (
          <Row key={i} name={`Ejercicio ${i}`} serie="3 × 8" top={i * 42} style={{ left: 0, right: 0, height: 34, opacity: 0.7 }} />
        ))}
      </div>
      <div className="nd-btnm">Agrupar en bloques</div>
      <Block color={AMBER} name="Calentamiento" sub="2 ejercicios" rows={[["Remo con banda", "2 × 12"]]} top={20} className="nd-b1" />
      <Block color={GREEN} name="Fuerza" sub="4 ejercicios" rows={[["Press de banca", "3 × 8"], ["Remo con mancuerna", "3 × 10"]]} top={120} className="nd-b2" />
    </div>
  );
}

function Page() {
  return (
    <div className="nd nd-d4">
      {[
        ["Full body, día 1", "3 bloques"],
        ["Fuerza torso", "2 bloques"],
      ].map(([n, s], i) => (
        <Row key={n} name={n} serie={s} top={66 + i * 46} />
      ))}
      <div className="nd-btnm">Editar</div>
      <div className="nd-pgw">
        <b className="nd-pg-title">Full body, día 1</b>
        <Block color={AMBER} name="Calentamiento" sub="1 ejercicio" rows={[FLAT[0]]} top={44} className="nd-wide" />
        <Block color={GREEN} name="Fuerza" sub="2 ejercicios" rows={[FLAT[2], FLAT[3]]} top={128} className="nd-wide" />
      </div>
    </div>
  );
}

// RM y carga como % del RM (CYC-312). El estado base es el final; la animación hace entrar el resultado.
function RmPercentRow() {
  return (
    <div className="nd nd-rm">
      <div className="nd-rw nd-rm-row" style={{ top: 96, height: 60 }}>
        <b>Sentadilla</b>
        <span className="nd-rm-field">
          <i>80</i>
          <u>% RM</u>
        </span>
        <span className="nd-rm-kg nd-rm-pop">72,5 kg</span>
      </div>
    </div>
  );
}

function RmAthleteSheet() {
  const rows: [string, string, string, string][] = [
    ["Sentadilla", "90 kg", "12 nov", "Coach"],
    ["Peso muerto", "110 kg", "12 nov", "Coach"],
    ["Remo con barra", "57 kg", "29 oct", "Aproximado"],
  ];
  return (
    <div className="nd nd-rm">
      {rows.map(([n, kg, d, o], i) => (
        <div key={n} className={`nd-rw nd-rm-sheet${i === 2 ? " nd-rm-pop" : ""}`} style={{ top: 40 + i * 62, height: 50 }}>
          <b>{n}</b>
          <span className="nd-rm-col">{kg}</span>
          <span className="nd-rm-col nd-rm-dim">{d}</span>
          <span className={`nd-rm-tag${o === "Aproximado" ? " nd-rm-tag-g" : ""}`}>{o}</span>
        </div>
      ))}
    </div>
  );
}

function RmMultiAdd() {
  const rows: [string, string, boolean][] = [
    ["Valentina Soto", "72,5 kg", true],
    ["Josefa Pino", "80 kg", true],
    ["Matías Vera", "Sin RM", false],
  ];
  return (
    <div className="nd nd-rm">
      {rows.map(([n, kg, ok], i) => (
        <div key={n} className="nd-rw nd-rm-sheet" style={{ top: 30 + i * 62, height: 50 }}>
          <b>{n}</b>
          <span className={ok ? "nd-rm-kg" : "nd-rm-kg nd-rm-off"}>{kg}</span>
          <span className={ok ? "nd-rm-state" : "nd-rm-state nd-rm-off"}>{ok ? "Lista" : "Falta RM"}</span>
        </div>
      ))}
      <div className="nd-rm-alert nd-rm-pop">Te avisamos para que agregues o calcules su RM</div>
    </div>
  );
}

// Equipos del coach (CYC-310).
function TeamsGroup() {
  const teams: [string, string, string, number][] = [
    ["V", "Voleibol sub-17", "#2f9e5f", 12],
    ["F", "Fuerza mañana", "#1a66dd", 5],
    ["S", "Selección regional", "#7a4bd6", 8],
  ];
  return (
    <div className="nd nd-rm nd-tm">
      {teams.map(([i, n, c, count], k) => (
        <div key={n} className={`nd-rw nd-tm-card${k === 2 ? " nd-rm-pop" : ""}`} style={{ top: 28 + k * 78, height: 66 }}>
          <span className="nd-tm-i" style={{ background: c }}>{i}</span>
          <b>{n}</b>
          <span className="nd-tm-av">
            <i>VS</i>
            <i>CR</i>
            <i>JP</i>
          </span>
          <small>{count} atletas</small>
        </div>
      ))}
    </div>
  );
}

function TeamsCreate() {
  const rows: [string, boolean][] = [
    ["Valentina Soto", true],
    ["Camila Rojas", true],
    ["Josefa Pino", true],
    ["Matías Vera", false],
  ];
  return (
    <div className="nd nd-rm nd-tm">
      <div className="nd-tm-field">Voleibol sub-17</div>
      {rows.map(([n, on], i) => (
        <div key={n} className={`nd-rw nd-tm-pick${on ? " nd-rm-pop" : ""}`} style={{ top: 70 + i * 52, height: 44 }}>
          <span className={on ? "nd-tm-box nd-tm-box-on" : "nd-tm-box"}>{on ? "✓" : ""}</span>
          <b>{n}</b>
        </div>
      ))}
    </div>
  );
}

function AthleteRmPercent() {
  return (
    <div className="nd nd-rm nd-rm-center">
      <div className="nd-rm-box">
        <b>80 %</b>
        <small>de tu RM</small>
      </div>
      <span className="nd-rm-arrow">→</span>
      <div className="nd-rm-box nd-rm-on nd-rm-pop">
        <b>72,5 kg</b>
        <small>tu peso</small>
      </div>
    </div>
  );
}

export function NoveltyDemo({ slide }: { slide: NoveltySlide }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  if (slide.video) {
    return (
      <div className="nd-video-frame" role="img" aria-label={slide.demoLabel}>
        <video className="nd-video" src={slide.video} poster={slide.poster} autoPlay loop muted playsInline />
      </div>
    );
  }
  const art = slide.demo === "blocks-group" ? <Group /> : slide.demo === "blocks-move" ? <Move /> : slide.demo === "blocks-legacy" ? <Legacy /> : slide.demo === "blocks-page" ? <Page /> : slide.demo === "rm-percent-row" ? <RmPercentRow /> : slide.demo === "rm-athlete-sheet" ? <RmAthleteSheet /> : slide.demo === "rm-multi-add" ? <RmMultiAdd /> : slide.demo === "athlete-rm-percent" ? <AthleteRmPercent /> : slide.demo === "teams-group" ? <TeamsGroup /> : slide.demo === "teams-create" ? <TeamsCreate /> : null;
  // Escala del escenario al ancho disponible (nunca se agranda ni se recorta).
  const scale = width === 0 ? 1 : Math.min(1, Math.max(0.3, width / STAGE_W));
  return (
    <div ref={ref} className="nd-frame" role="img" aria-label={slide.demoLabel} style={{ height: STAGE_H * scale }}>
      <div className="nd-scaler" style={{ width: STAGE_W * scale, height: STAGE_H * scale }}>
        <div className="nd-stage" style={{ transform: `scale(${scale})` }}>
          {art}
        </div>
      </div>
    </div>
  );
}
