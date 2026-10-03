import type { ReactNode } from "react";

// Maquetas de las pantallas de la app del atleta, con el lenguaje visual
// aprobado para mobile (tarjeta oscura con cadena de proteína, números en
// Bricolage, cuentas para el esfuerzo, barra isla flotante) y los textos
// reales de la app. No son capturas del simulador. Estilos en landing.css.

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

function Island() {
  return (
    <div className="lp-island">
      <span>
        <svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2.5" /><path d="M4 10h16M9 3v4M15 3v4" /></svg>
      </span>
      <span className="lp-on">
        <svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" /></svg>
        Inicio
      </span>
      <span>
        <svg viewBox="0 0 24 24"><path d="M5 20V10M12 20V4M19 20v-7" /></svg>
      </span>
    </div>
  );
}

export function HoyDevice() {
  return (
    <Device label="Pantalla Hoy de la app: la sesión Piernas con 1 de 4 ejercicios completados">
      <div className="lp-sb"><span>18:40</span><em>•••</em></div>
      <div className="lp-m-head"><h4>Hoy</h4><div className="lp-avatar">VS</div></div>
      <div className="lp-m-hero">
        <Beads />
        <div className="lp-m-row"><span className="lp-m-week">Semana 4</span><span className="lp-m-pill">Asignada para hoy</span></div>
        <div className="lp-m-title">Piernas</div>
        <div className="lp-m-count"><b>1</b><span>de 4 ejercicios</span></div>
        <div className="lp-m-seg"><i className="lp-on" /><i /><i /><i /></div>
        <div className="lp-m-hbtn"><span>Continuar: Prensa de piernas</span><svg viewBox="0 0 24 24">{arrow}</svg></div>
      </div>
      <div className="lp-m-card lp-m-ex">
        <div className="lp-node lp-done"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></div>
        <div className="lp-t"><b>Sentadilla con barra</b><small>4 × 6 · 70 kg</small></div>
        <span className="lp-pill-n lp-ok">4/4</span>
      </div>
      <div className="lp-m-card lp-m-ex lp-cur">
        <div className="lp-node lp-cur">2</div>
        <div className="lp-t"><b>Prensa de piernas</b><small>3 × 10 · 120 kg</small></div>
        <span className="lp-pill-n lp-cur">0/3</span>
      </div>
      <div className="lp-m-card lp-m-ex">
        <div className="lp-node">3</div>
        <div className="lp-t"><b>Zancadas con mancuernas</b><small>3 × 10 · 16 kg</small></div>
        <span className="lp-pill-n">0/3</span>
      </div>
      <div className="lp-m-card lp-m-ex">
        <div className="lp-node">4</div>
        <div className="lp-t"><b>Peso muerto</b><small>3 × 5 · 80 kg</small></div>
        <span className="lp-pill-n">0/3</span>
      </div>
      <Island />
    </Device>
  );
}

export function SerieDevice() {
  return (
    <Device label="Pantalla de registro de serie: peso, repeticiones y repeticiones en reserva">
      <div className="lp-sb"><span>18:52</span><em>•••</em></div>
      <div className="lp-m-back"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg></div>
      <div className="lp-m-h2">Prensa de piernas</div>
      <div className="lp-m-set"><span>Serie 2 de 3</span></div>
      <div className="lp-m-card lp-m-target"><b>3 × 10</b><span>120 kg</span></div>
      <div className="lp-m-card lp-m-step">
        <label>Peso</label>
        <div className="lp-m-stepper"><span className="lp-m-stepbtn">−</span><strong>120<small>kg</small></strong><span className="lp-m-stepbtn">+</span></div>
      </div>
      <div className="lp-m-card lp-m-step">
        <label>Repeticiones</label>
        <div className="lp-m-stepper"><span className="lp-m-stepbtn">−</span><strong>10</strong><span className="lp-m-stepbtn">+</span></div>
      </div>
      <div className="lp-m-card lp-m-step">
        <label>RIR, repeticiones que te quedaron</label>
        <div className="lp-chips"><span>0</span><span>1</span><span className="lp-on">2</span><span>3</span><span>4</span></div>
      </div>
      <div className="lp-m-fixed"><div className="lp-m-btn">Guardar serie</div></div>
    </Device>
  );
}

export function CierreDevice() {
  const effort = [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0];
  return (
    <Device label="Pantalla de cierre de sesión: esfuerzo, resultado, dolor y notas para el coach">
      <div className="lp-sb"><span>19:41</span><em>•••</em></div>
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
      <div className="lp-m-card lp-m-line"><span>¿Sentiste dolor?</span><span className="lp-sw" /></div>
      <div className="lp-m-card lp-m-notes">Notas para tu coach (opcional)</div>
      <div className="lp-m-fixed"><div className="lp-m-btn">Enviar</div></div>
    </Device>
  );
}
