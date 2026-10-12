import { useEffect, useRef, useState } from "react";
import inicio from "../../assets/landing/coach-inicio.jpg";
import rutinas from "../../assets/landing/coach-rutinas.jpg";
import planes from "../../assets/landing/coach-planes.jpg";

// Marco de navegador de la portada: la plataforma del coach alterna sola entre
// sus tres vistas (Inicio, Rutinas, Planes) y cada pestaña se puede elegir a
// mano. Al elegir una, la rotación se detiene. Solo rota mientras está a la
// vista y no rota con "reducir movimiento". Las capturas salen de la base de
// demostración (apps/api/scripts/seed-demo.ts), con personas ficticias.
const VIEWS = [
  { label: "Inicio", src: inicio, alt: "Inicio del coach: atletas que necesitan atención y lista de atletas" },
  { label: "Rutinas", src: rutinas, alt: "Editor de rutinas: ejercicios con series, repeticiones y carga, y resumen de la carga de la sesión" },
  { label: "Planes", src: planes, alt: "Visualizador de un plan: avance por semanas y sesiones de cada semana" },
];
const INTERVAL_MS = 4500;

export function CoachShowcase() {
  const [index, setIndex] = useState(0);
  const [manual, setManual] = useState(false);
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (manual || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let visible = true;
    const seen = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
    });
    if (host.current) seen.observe(host.current);
    const id = window.setInterval(() => {
      if (visible && !document.hidden) setIndex((i) => (i + 1) % VIEWS.length);
    }, INTERVAL_MS);
    return () => {
      window.clearInterval(id);
      seen.disconnect();
    };
  }, [manual]);

  return (
    <div className={manual ? "lp-coach lp-manual" : "lp-coach"} ref={host}>
      <div className="lp-tabs" role="tablist" aria-label="Vistas de la plataforma del coach">
        <span className="lp-tabs-l">Plataforma del coach</span>
        {VIEWS.map((v, i) => (
          <button
            key={v.label}
            type="button"
            role="tab"
            aria-selected={i === index}
            className={i === index ? "lp-tab lp-on" : "lp-tab"}
            onClick={() => {
              setIndex(i);
              setManual(true);
            }}
          >
            {v.label}
          </button>
        ))}
      </div>
      <div className="lp-browser">
        <div className="lp-browser-top"><i /><i /><i /></div>
        <div className="lp-slides">
          {VIEWS.map((v, i) => (
            <img
              key={v.label}
              src={v.src}
              alt={v.alt}
              className={i === index ? "lp-on" : undefined}
              aria-hidden={i !== index}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
