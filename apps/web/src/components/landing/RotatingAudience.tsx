import { useEffect, useLayoutEffect, useRef, useState } from "react";

// "PARA" fija y, al lado, un carrete que gira hacia abajo entre los nombres
// con que se conoce a quien arma los ciclos de entrenamiento de otros. Los
// lectores de pantalla reciben la lista completa en una sola frase; con
// "reducir movimiento" no gira y queda la primera palabra.
const AUDIENCES = ["coaches", "personal trainers", "preparadores físicos", "entrenadores de equipos"];
const INTERVAL_MS = 1500;

export function RotatingAudience() {
  const [state, setState] = useState<{ cur: number; prev: number | null }>({ cur: 0, prev: null });
  const box = useRef<HTMLSpanElement>(null);
  const words = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setState((s) => ({ cur: (s.cur + 1) % AUDIENCES.length, prev: s.cur }));
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  // El ancho del carrete sigue a la palabra visible (y se recalcula al cargar la tipografía).
  useLayoutEffect(() => {
    const fit = () => {
      const word = words.current[state.cur];
      if (box.current && word) box.current.style.width = `${word.offsetWidth}px`;
    };
    fit();
    void document.fonts?.ready.then(fit);
  }, [state.cur]);

  return (
    <p className="lp-eyebrow">
      <span className="lp-vh">Para coaches, personal trainers, preparadores físicos y entrenadores de equipos</span>
      <span className="lp-para" aria-hidden="true">
        Para
      </span>
      <span className="lp-rot" aria-hidden="true" ref={box}>
        {AUDIENCES.map((word, i) => (
          <span
            key={word}
            ref={(el) => {
              words.current[i] = el;
            }}
            className={i === state.cur ? "lp-rot-w lp-on" : i === state.prev ? "lp-rot-w lp-out" : "lp-rot-w"}
          >
            {word}
          </span>
        ))}
      </span>
    </p>
  );
}
