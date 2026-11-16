import { useEffect, useRef, useState } from "react";
import inicioW1 from "../../assets/landing/coach-inicio-1440.webp";
import inicioW2 from "../../assets/landing/coach-inicio-2880.webp";
import inicioJ1 from "../../assets/landing/coach-inicio-1440.jpg";
import inicioJ2 from "../../assets/landing/coach-inicio-2880.jpg";
import cicloW1 from "../../assets/landing/coach-ciclo-1440.webp";
import cicloW2 from "../../assets/landing/coach-ciclo-2880.webp";
import cicloJ1 from "../../assets/landing/coach-ciclo-1440.jpg";
import cicloJ2 from "../../assets/landing/coach-ciclo-2880.jpg";
import rutinasW1 from "../../assets/landing/coach-rutinas-1440.webp";
import rutinasW2 from "../../assets/landing/coach-rutinas-2880.webp";
import rutinasJ1 from "../../assets/landing/coach-rutinas-1440.jpg";
import rutinasJ2 from "../../assets/landing/coach-rutinas-2880.jpg";

// Marco de navegador de la portada: la plataforma del coach alterna sola entre
// sus tres vistas (Inicio, Ciclo, Rutinas) y cada pestaña se puede elegir a
// mano. Al elegir una, la rotación se detiene. Solo rota mientras está a la
// vista y no rota con "reducir movimiento". Las capturas salen de la base de
// demostración (apps/api/scripts/seed-demo.ts), con personas ficticias.
// Cada vista trae WebP y JPG a 1440 y 2880 px (srcset) con el tamaño real
// de la captura (2880 × 1800) para que no salte el diseño.
const VIEWS = [
  {
    label: "Inicio",
    webp: `${inicioW1} 1440w, ${inicioW2} 2880w`,
    jpg: `${inicioJ1} 1440w, ${inicioJ2} 2880w`,
    src: inicioJ1,
    alt: "Inicio del coach: atletas que necesitan atención, la semana con sus sesiones y la lista de atletas",
  },
  {
    label: "Ciclo",
    webp: `${cicloW1} 1440w, ${cicloW2} 2880w`,
    jpg: `${cicloJ1} 1440w, ${cicloJ2} 2880w`,
    src: cicloJ1,
    alt: "Pizarra del ciclo: rutinas asignadas a cada día de la semana",
  },
  {
    label: "Rutinas",
    webp: `${rutinasW1} 1440w, ${rutinasW2} 2880w`,
    jpg: `${rutinasJ1} 1440w, ${rutinasJ2} 2880w`,
    src: rutinasJ1,
    alt: "Editor de rutina con nota del coach: ejercicios con series, repeticiones y carga, y carga de la sesión",
  },
];
const SIZES = "(max-width: 820px) 92vw, 640px";
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
            <picture key={v.label}>
              <source type="image/webp" srcSet={v.webp} sizes={SIZES} />
              <img
                src={v.src}
                srcSet={v.jpg}
                sizes={SIZES}
                width={2880}
                height={1800}
                alt={v.alt}
                className={i === index ? "lp-on" : undefined}
                aria-hidden={i !== index}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
              />
            </picture>
          ))}
        </div>
      </div>
    </div>
  );
}
