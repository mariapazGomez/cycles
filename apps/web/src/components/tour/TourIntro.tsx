import { useEffect, useId, useRef } from "react";

// Dibujo de «Así se arma un ciclo»: tres cajas encajadas (ciclo > rutina >
// ejercicio). Va con una lista equivalente en texto para el lector de pantalla.
export function CycleDiagram() {
  return (
    <>
      <div className="tourl-diagram" aria-hidden="true">
        <div className="tourl-box tourl-box-cycle">
          <span className="tourl-box-label">
            <b>Ciclo</b> · Fuerza base · 6 semanas
          </span>
          <div className="tourl-box-row">
            <div className="tourl-box tourl-box-routine">
              <span className="tourl-box-label">
                <b>Rutina</b> Torso A
              </span>
              <span className="tourl-chip-ex">Ejercicio · Press banca</span>
              <span className="tourl-chip-ex">Ejercicio · Remo</span>
            </div>
            <div className="tourl-box tourl-box-routine">
              <span className="tourl-box-label">
                <b>Rutina</b> Pierna
              </span>
              <span className="tourl-chip-ex">Ejercicio · Sentadilla</span>
            </div>
          </div>
        </div>
      </div>
      <ul className="tour-sr">
        <li>Un ciclo contiene rutinas.</li>
        <li>Cada rutina contiene ejercicios.</li>
      </ul>
    </>
  );
}

// Tarjeta «Así se arma un ciclo»: explica cómo se piensa un ciclo antes de la
// guía. Pequeña, sin velo, abajo a la derecha: la app se ve detrás.
export function TourIntro({ onStart, onLater, saving }: { onStart: () => void; onLater: () => void; saving: boolean }) {
  const titleId = useId();
  const startRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    startRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onLater();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="tourl-root tourl-intro" role="dialog" aria-modal="false" aria-labelledby={titleId}>
      <h2 id={titleId}>Así se arma un ciclo</h2>
      <CycleDiagram />
      <p>Un ciclo organiza las semanas de tu atleta.</p>
      <p>Contiene rutinas: la sesión de cada día.</p>
      <p>Cada rutina contiene ejercicios.</p>
      <p className="tourl-intro-end">Lo armamos en ese orden.</p>
      <div className="tourl-actions">
        <button ref={startRef} type="button" className="tourl-btn" onClick={onStart}>
          Empezar la guía
        </button>
        <button type="button" className="tourl-link" disabled={saving} onClick={onLater}>
          Ahora no
        </button>
      </div>
    </section>
  );
}
