import { memo, type ReactNode } from "react";

// Maquetas de las pantallas de la app del atleta, puestas al día con la app
// real (CYC-216): Hoy con «Esta semana» y la sesión por bloques, Serie con la
// nota del coach, Cierre, y la isla de cuatro íconos. Datos de ejemplo
// (atleta ficticia). No son capturas del simulador: se animan. Sin «Esfuerzo
// medio», sin la pregunta de dolor y sin Resumen (decisión de la usuaria,
// 2026-11-16). Estilos en landing.css.

// [x, y, radio, opacidad] sobre un lienzo de 170 × 130 (igual que BeadChain en mobile).
const BEADS: Array<[number, number, number, number]> = [
  [10, 90, 5, 0.5], [28, 70, 7, 0.8], [50, 56, 4, 0.4], [72, 50, 8, 0.9], [96, 52, 5, 0.5],
  [118, 44, 7, 0.8], [138, 28, 4, 0.4], [152, 10, 8, 0.9], [40, 100, 4, 0.3], [62, 92, 6, 0.6],
  [88, 96, 4, 0.35], [112, 84, 7, 0.7], [134, 70, 5, 0.5], [156, 56, 8, 0.85],
];

function Beads() {
  return (
    <div className="lp-beads">
      {BEADS.map(([x, y, r, o]) => (
        <i
          key={`${x}-${y}`}
          style={{ left: x - r, top: y - r, width: r * 2, height: r * 2, opacity: o }}
        />
      ))}
    </div>
  );
}

const arrow = <path d="M5 12h14M13 6l6 6-6 6" />;

function Device({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="lp-device" role="img" aria-label={label}>
      <div className="lp-device-in" aria-hidden="true">
        <div className="lp-screen">{children}</div>
      </div>
    </div>
  );
}

// Isla flotante de la app: cuatro íconos sin etiqueta (Calendario, Hoy, tercera
// pestaña y chat). El activo lleva el fondo azul claro.
function Island() {
  return (
    <div className="lp-island">
      <span>
        <svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2.5" /><path d="M4 10h16M9 3v4M15 3v4" /></svg>
      </span>
      <span className="lp-on">
        <svg viewBox="0 0 24 24"><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11" /></svg>
      </span>
      <span>
        <svg viewBox="0 0 24 24"><path d="M5 20V10M12 20V4M19 20v-7" /></svg>
      </span>
      <span>
        <svg viewBox="0 0 24 24"><path d="M4 5.5h16v11H9.5L5 20.5v-4H4z" /></svg>
      </span>
    </div>
  );
}

// Barra de estado limpia: 9:41 y batería llena.
function StatusBar() {
  return (
    <div className="lp-sb">
      <span>9:41</span>
      <svg className="lp-bat" viewBox="0 0 54 14" aria-hidden="true">
        <path d="M2 11.5h2.5V8H2zM6.5 11.5H9V6H6.5zM11 11.5h2.5V4H11zM15.5 11.5H18V2h-2.5z" />
        <rect x="26" y="1.5" width="23" height="11" rx="3.5" fill="none" strokeWidth="1.2" />
        <rect x="28" y="3.5" width="19" height="7" rx="2" />
        <path d="M51 5v4" strokeWidth="1.6" />
      </svg>
    </div>
  );
}

// Anillo de «Esta semana»: pct de 0 a 100.
function WeekRing({ pct }: { pct: number }) {
  const C = 2 * Math.PI * 34;
  return (
    <div className="lp-wring">
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r="34" className="lp-wring-bg" />
        <circle cx="40" cy="40" r="34" className="lp-wring-fg" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} transform="rotate(-90 40 40)" />
      </svg>
      <b>{pct}%</b>
    </div>
  );
}

function HoyDeviceBase() {
  return (
    <Device label="Pantalla Hoy de la app: la tarjeta Esta semana, la sesión Piernas con 2 de 4 ejercicios completados y sus bloques">
      <StatusBar />
      <div className="lp-m-head">
        <h4>Hoy</h4>
        <div className="lp-m-headr">
          <svg viewBox="0 0 24 24" className="lp-bell"><path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21h4" /></svg>
          <div className="lp-avatar">MF</div>
        </div>
      </div>
      <div className="lp-m-card lp-m-wk">
        <div className="lp-m-wk-t"><b>Esta semana</b><span>9 al 15 nov</span></div>
        <div className="lp-m-wk-b">
          <WeekRing pct={33} />
          <div className="lp-m-wk-r">
            <div><span>Sesiones</span><b className="lp-wk-ses">1 de 3</b></div>
            <div><span>Tiempo entrenado</span><b className="lp-wk-time">1 h 5 min</b></div>
          </div>
        </div>
      </div>
      <div className="lp-m-hero">
        <Beads />
        <div className="lp-m-row"><span className="lp-m-week">Semana 4</span></div>
        <div className="lp-m-title">Piernas</div>
        <div className="lp-m-count"><b>2</b><span>de 4 ejercicios</span></div>
        <div className="lp-m-seg"><i className="lp-on" /><i className="lp-on" /><i /><i /></div>
        <div className="lp-m-hbtn"><span>Continuar: Prensa de piernas</span><svg viewBox="0 0 24 24">{arrow}</svg></div>
      </div>
      <div className="lp-m-block">
        <i className="lp-bi lp-bi-warm"><svg viewBox="0 0 24 24"><path d="M12 3c3 4 5 6.5 5 10a5 5 0 0 1-10 0c0-1.6.6-2.8 1.6-4 .3 1.2 1 2 1.9 2.4C10.2 8.8 10.6 6 12 3z" /></svg></i>
        <div className="lp-t"><b>Calentamiento</b><small>1 ejercicio, 2 series</small></div>
        <span className="lp-pill-n lp-ok lp-bp">Hecho</span>
      </div>
      <div className="lp-m-block lp-open">
        <i className="lp-bi lp-bi-str"><svg viewBox="0 0 24 24"><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11" /></svg></i>
        <div className="lp-t"><b>Fuerza</b><small>3 ejercicios, 10 series</small></div>
        <span className="lp-pill-n lp-cur lp-bp">0 de 3</span>
      </div>
      <div className="lp-m-card lp-m-ex lp-sub">
        <div className="lp-node lp-done"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></div>
        <div className="lp-t"><b>Sentadilla con barra</b><small>4 × 6 · 70 kg</small></div>
        <span className="lp-pill-n lp-ok">4/4</span>
      </div>
      <div className="lp-m-card lp-m-ex lp-sub lp-cur">
        <div className="lp-node lp-cur">2</div>
        <div className="lp-t"><b>Prensa de piernas</b><small>3 × 10 · 120 kg</small></div>
        <span className="lp-pill-n lp-cur">0/3</span>
      </div>
      <div className="lp-m-card lp-m-ex lp-sub">
        <div className="lp-node">3</div>
        <div className="lp-t"><b>Zancadas con mancuernas</b><small>3 × 10 · 16 kg</small></div>
        <span className="lp-pill-n">0/3</span>
      </div>
      <Island />
    </Device>
  );
}

function SerieDeviceBase() {
  return (
    <Device label="Pantalla de registro de serie: nota del coach, repeticiones, peso y repeticiones en reserva">
      <StatusBar />
      <div className="lp-m-back"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg></div>
      <div className="lp-m-h2">Prensa de piernas</div>
      <div className="lp-m-set"><span>Serie 2 de 3</span></div>
      <div className="lp-m-card lp-m-coach"><small>Nota de tu coach</small><p>Baja controlado y sube sin rebote.</p></div>
      <div className="lp-m-card lp-m-step">
        <div className="lp-m-steph"><label>Repeticiones</label><span className="lp-goal">Meta: 10 reps</span></div>
        <div className="lp-m-stepper"><span className="lp-m-stepbtn">−</span><strong>10</strong><span className="lp-m-stepbtn">+</span></div>
      </div>
      <div className="lp-m-card lp-m-step">
        <div className="lp-m-steph"><label>Peso (kg)</label></div>
        <div className="lp-m-stepper"><span className="lp-m-stepbtn">−</span><strong>120</strong><span className="lp-m-stepbtn">+</span></div>
      </div>
      <div className="lp-m-card lp-m-step">
        <div className="lp-m-steph"><label>RIR, repeticiones que te quedaron</label></div>
        <div className="lp-chips"><span>0</span><span>1</span><span className="lp-on">2</span><span>3</span><span>4+</span></div>
      </div>
      <div className="lp-m-fixed"><div className="lp-m-btn">Guardar serie</div></div>
    </Device>
  );
}

function CierreDeviceBase() {
  const effort = [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0];
  return (
    <Device label="Pantalla de cierre de sesión: esfuerzo, resultado y notas para el coach">
      <StatusBar />
      <div className="lp-m-h2 lp-m-h2-close">¿Cómo fue tu sesión?</div>
      <div className="lp-m-dark">
        <h5>¿Qué tan dura fue?</h5>
        <div className="lp-effort">
          {effort.map((on, i) => (
            <i key={i} className={on ? "lp-on" : ""} />
          ))}
        </div>
        <div className="lp-effort-l"><span>0 Nada</span><span>10 Máxima</span></div>
      </div>
      <div className="lp-m-card lp-opt lp-on"><i />Terminé todo</div>
      <div className="lp-m-card lp-opt"><i />Terminé una parte</div>
      <div className="lp-m-card lp-opt"><i />No pude entrenar</div>
      <div className="lp-m-card lp-m-notes">Notas para tu coach (opcional)</div>
      <div className="lp-m-fixed"><div className="lp-m-btn">Enviar</div></div>
    </Device>
  );
}

export const HoyDevice = memo(HoyDeviceBase);
export const SerieDevice = memo(SerieDeviceBase);
export const CierreDevice = memo(CierreDeviceBase);
