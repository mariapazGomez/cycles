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
// El selector de equipo del sidebar, abierto: los equipos con su cantidad y «Crear equipo».
function TeamsGroup() {
  const teams: [string, string, string, number][] = [
    ["V", "Voleibol sub-17", "#2f9e5f", 12],
    ["F", "Fuerza mañana", "#1a66dd", 5],
    ["S", "Selección regional", "#7a4bd6", 8],
  ];
  return (
    <div className="nd nd-rm nd-tm">
      <div className="nd-tm-field">Voleibol sub-17 ⌄</div>
      <div className="nd-tm-menu">
        {teams.map(([i, n, c, count], k) => (
          <div key={n} className={`nd-tm-opt${k === 0 ? " nd-tm-opt-on" : ""}`}>
            <span className="nd-tm-i" style={{ background: c }}>{i}</span>
            <b>{n}</b>
            <small>{count}</small>
          </div>
        ))}
        <div className="nd-tm-opt nd-rm-pop">+ Crear equipo</div>
      </div>
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

// Nuevo ciclo por calendario (CYC-314), según docs/diseno/ciclo-del-equipo/novedad-nuevo-ciclo.html.
type CalCell = { n: number; cls?: string; delay?: number; session?: boolean };

function MiniCalendar({ cells }: { cells: CalCell[] }) {
  return (
    <div className="nd-cy-cal">
      {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
        <i key={i}>{d}</i>
      ))}
      {cells.map((c, i) => (
        <span key={i} className={c.cls} style={c.delay === undefined ? undefined : { animationDelay: `${c.delay}s` }}>
          {c.n}
          {c.session && <b />}
        </span>
      ))}
    </div>
  );
}

// Un rango pintado de corrido: primer día, los del medio uno tras otro y, si se pide, el último.
function paintedDays(days: number[], step: number, lastEdge: boolean): CalCell[] {
  return days.map((n, i) =>
    i === 0 ? { n, cls: "nd-cy-edge nd-cy-start" } : lastEdge && i === days.length - 1 ? { n, cls: "nd-cy-edge nd-cy-end" } : { n, cls: "nd-cy-in nd-cy-fill", delay: Number((i * step).toFixed(3)) },
  );
}

const upTo = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

function CycleRangeDemo() {
  return (
    <div className="nd nd-cy">
      <div className="nd-cy-box" style={{ left: 150, top: 28, width: 348 }}>
        <div className="nd-cy-h">Fechas del ciclo</div>
        <MiniCalendar cells={paintedDays([30, ...upTo(1, 20)], 0.045, true)} />
      </div>
      <div className="nd-cy-sum nd-cy-up" style={{ left: 182, top: 232 }}>
        Del lunes 30 nov al domingo 20 dic: 3 semanas
      </div>
    </div>
  );
}

function CycleFieldsDemo() {
  return (
    <div className="nd nd-cy">
      <div className="nd-cy-box nd-cy-arrive" style={{ left: 56, top: 34, width: 326 }}>
        {[
          ["Nombre", "Fuerza base"],
          ["Objetivo (opcional)", "Base de fuerza"],
          ["Fechas del ciclo", "30 nov – 20 dic"],
        ].map(([label, value], i) => (
          <div className="nd-cy-field" key={label}>
            <b>{label}</b>
            <div className={i === 2 ? "nd-cy-inp nd-cy-inp-on" : "nd-cy-inp"}>{value}</div>
          </div>
        ))}
      </div>
      {["Tipo de ciclo", "Sesiones por semana", "Fecha de inicio", "Duración"].map((t, i) => (
        <div key={t} className="nd-cy-old nd-cy-leave" style={{ left: 424, top: 48 + i * 50, animationDelay: `${i * 0.12}s` }}>
          {t}
        </div>
      ))}
    </div>
  );
}

function CycleGuardDemo() {
  const outs = [30, 2, 4];
  const cells: CalCell[] = [
    { n: 23, cls: "nd-cy-off" },
    { n: 24, cls: "nd-cy-off" },
    { n: 25, cls: "nd-cy-edge" },
    ...upTo(26, 28).map((n) => ({ n, cls: "nd-cy-in" })),
    { n: 29, cls: "nd-cy-edge nd-cy-end" },
    ...[30, ...upTo(1, 6)].map((n) => (outs.includes(n) ? { n, cls: "nd-cy-out nd-cy-up", session: true } : { n })),
  ];
  return (
    <div className="nd nd-cy">
      <div className="nd-cy-box" style={{ left: 52, top: 56, width: 316 }}>
        <div className="nd-cy-h">Fechas del ciclo</div>
        <MiniCalendar cells={cells} />
      </div>
      <div className="nd-cy-warn nd-cy-up" style={{ left: 392, top: 90 }}>
        Quedan 3 sesiones fuera. Muévelas o quítalas primero.
      </div>
    </div>
  );
}

function CycleTemplateDemo() {
  return (
    <div className="nd nd-cy">
      <div className="nd-cy-box" style={{ left: 44, top: 62, width: 196 }}>
        <div className="nd-cy-h">Plantilla «Pretemporada»</div>
        <div className="nd-cy-field">
          <b>Duración en semanas</b>
          <div className="nd-cy-inp" style={{ justifyContent: "center" }}>
            2
          </div>
        </div>
      </div>
      <div className="nd-cy-box" style={{ left: 266, top: 44, width: 338 }}>
        <div className="nd-cy-h">Elige solo el primer día</div>
        <MiniCalendar cells={paintedDays([30, ...upTo(1, 13)], 0.05, false)} />
      </div>
      <div className="nd-cy-sum nd-cy-up" style={{ left: 266, top: 206 }}>
        Termina el domingo 13 dic
      </div>
    </div>
  );
}

const CYCLE_DEMOS: Partial<Record<NonNullable<NoveltySlide["demo"]>, () => JSX.Element>> = {
  "cycle-range": CycleRangeDemo,
  "cycle-fields": CycleFieldsDemo,
  "cycle-guard": CycleGuardDemo,
  "cycle-template": CycleTemplateDemo,
};

// Dos ciclos a la vez (CYC-316), según docs/diseno/ciclo-del-equipo/novedad-dos-ciclos.html.
function TwoCyclesBlock({ name, week, marks, count, className }: { name: string; week: string; marks: string; count: string; className?: string }) {
  return (
    <div className={className}>
      <div className="nd-tc-cy">
        {name}
        <small>{week}</small>
      </div>
      {/* Un carácter por día: d hecha, p pendiente, n sin sesión. */}
      <div className="nd-tc-week">
        {[...marks].map((m, i) => (
          <i key={i} className={`nd-tc-${m}`} />
        ))}
      </div>
      <div className="nd-tc-count">{count}</div>
    </div>
  );
}

function TwoCyclesCard({ alert }: { alert?: boolean }) {
  return (
    <div className="nd">
      <div className="nd-tc-card">
        <div className="nd-tc-who">
          <span>CR</span>Camila Rojas
        </div>
        {alert && <div className="nd-tc-alert nd-tc-up">Sesión omitida en Rehabilitación hombro</div>}
        <TwoCyclesBlock className={alert ? undefined : "nd-tc-in1"} name="Fuerza base" week="Semana 1 de 4" marks="dnpnpnn" count="1 de 2 sesiones completadas" />
        <hr />
        <TwoCyclesBlock className={alert ? undefined : "nd-tc-in2"} name="Rehabilitación hombro" week="Semana 1 de 3" marks="nnpnpnn" count="0 de 1 sesión completada" />
      </div>
    </div>
  );
}

function TwoCyclesToday({ start }: { start?: boolean }) {
  return (
    <div className="nd">
      <div className={`nd-tc-ses nd-tc-left${start ? "" : " nd-tc-in1"}`} style={{ top: start ? 42 : 56 }}>
        <span className="nd-tc-chip">Fuerza base</span>
        <b>Te toca Torso</b>
        <div className="nd-tc-li">
          Press de banca<span>4 × 8</span>
        </div>
        {start ? (
          <div className="nd-tc-primary">Empezar sesión</div>
        ) : (
          <div className="nd-tc-li">
            Remo con barra<span>4 × 8</span>
          </div>
        )}
      </div>
      <div className={`nd-tc-ses nd-tc-right${start ? "" : " nd-tc-in2"}`} style={{ top: start ? 78 : 56 }}>
        <span className="nd-tc-chip">Rehabilitación hombro</span>
        <b>Te toca Movilidad</b>
        {start ? (
          <div className="nd-tc-row">
            <span className="nd-tc-link">Ver 4 ejercicios</span>
            <span className="nd-tc-secondary nd-tc-press">Empezar sesión</span>
          </div>
        ) : (
          <div className="nd-tc-li">4 ejercicios</div>
        )}
      </div>
    </div>
  );
}

function TeamCycleDemo() {
  return (
    <div className="nd nd-tmc">
      <div className="nd-tmc-card">
        <b>Piernas base</b>
        <small>Equipo</small>
      </div>
      <span className="nd-tmc-arrow">→</span>
      <div className="nd-tmc-people">
        {["VS", "CR", "JP", "MV"].map((who, i) => (
          <span key={who} style={{ animationDelay: `${i * 0.25}s` }}>
            {who}
          </span>
        ))}
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
  const CycleDemo = slide.demo ? CYCLE_DEMOS[slide.demo] : undefined;
  const art = CycleDemo ? <CycleDemo /> : slide.demo === "blocks-group" ? <Group /> : slide.demo === "blocks-move" ? <Move /> : slide.demo === "blocks-legacy" ? <Legacy /> : slide.demo === "blocks-page" ? <Page /> : slide.demo === "rm-percent-row" ? <RmPercentRow /> : slide.demo === "rm-athlete-sheet" ? <RmAthleteSheet /> : slide.demo === "rm-multi-add" ? <RmMultiAdd /> : slide.demo === "athlete-rm-percent" ? <AthleteRmPercent /> : slide.demo === "two-cycles-card" ? <TwoCyclesCard /> : slide.demo === "two-cycles-alert" ? <TwoCyclesCard alert /> : slide.demo === "two-cycles-today" ? <TwoCyclesToday /> : slide.demo === "two-cycles-start" ? <TwoCyclesToday start /> : slide.demo === "teams-group" ? <TeamsGroup /> : slide.demo === "teams-create" ? <TeamsCreate /> : slide.demo === "team-cycle" ? <TeamCycleDemo /> : null;
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
