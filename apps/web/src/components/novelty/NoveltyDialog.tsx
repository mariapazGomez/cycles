import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Novelty, NoveltySlide } from "@cycles/shared";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import { NoveltyDemo } from "./NoveltyDemo";

// Popup central de una novedad: fondo borroso, de 2 a 4 slides con su demostración.
// Las slides solo cambian cuando la persona lo pide (sin autoavance). Cerrar, saltar o
// llegar al final llama a `onClose`; quien lo abrió decide si eso marca la novedad como vista.
export function NoveltyDialog({ novelty, slides, onClose }: { novelty: Novelty; slides: NoveltySlide[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const stableClose = useCallback(() => closeRef.current(), []);
  const titleId = useId();
  const textId = useId();
  useDialogFocus(ref as React.RefObject<HTMLElement>, stableClose);

  const last = index === slides.length - 1;
  const slide = slides[index];
  const go = useCallback((n: number) => setIndex(Math.min(Math.max(n, 0), slides.length - 1)), [slides.length]);

  // Flechas ← → cambian de slide.
  useEffect(() => {
    const root = ref.current;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
    }
    root?.addEventListener("keydown", onKey);
    return () => root?.removeEventListener("keydown", onKey);
  }, [go, index]);

  if (!slide) return null;
  return (
    <div
      className="nv-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) stableClose();
      }}
    >
      <div ref={ref} className="nv-card" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={textId} data-novelty={novelty.key}>
        <button type="button" className="nv-x" aria-label="Cerrar" onClick={stableClose}>
          ×
        </button>
        <div className="nv-demo-wrap">
          <NoveltyDemo slide={slide} key={`${novelty.key}-${index}`} />
        </div>
        <div className="nv-body">
          <p className="nv-eyebrow">Novedad · {novelty.name}</p>
          <h2 id={titleId} className="nv-title">
            {slide.title}
          </h2>
          <p id={textId} className="nv-text">
            {slide.text}
          </p>
        </div>
        <div className="nv-foot">
          <button type="button" className="nv-skip" onClick={stableClose}>
            {last ? "Cerrar" : "Saltar"}
          </button>
          <ol className="nv-dots" aria-label={`Slide ${index + 1} de ${slides.length}`}>
            {slides.map((_, i) => (
              <li key={i} className={i === index ? "nv-dot nv-dot-on" : "nv-dot"} aria-hidden="true" />
            ))}
          </ol>
          <div className="nv-nav">
            {index > 0 && (
              <button type="button" className="nv-back" onClick={() => go(index - 1)}>
                Atrás
              </button>
            )}
            <button type="button" className="nv-next" data-autofocus onClick={() => (last ? stableClose() : go(index + 1))}>
              {last ? "Entendido" : "Siguiente"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
