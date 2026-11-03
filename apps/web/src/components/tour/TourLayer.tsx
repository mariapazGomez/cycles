import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTour } from "../../hooks/useTour";
import { TOUR_STEP_COUNT, type TourStepN } from "../../lib/tour";
import { pickMark, stepPath, type Mark, type MarkContext } from "../../lib/tourMarks";
import { TourIntro } from "./TourIntro";

const MOBILE = 640;
const TABLET = 1279;

// Vuelve a dibujar cuando cambia la pantalla (elementos que aparecen o
// desaparecen, campos que se llenan, cambio de tamaño). Ignora lo que cambia
// la propia guía para no entrar en un ciclo.
function useDomTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let raf = 0;
    const bump = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setTick((n) => n + 1));
    };
    const observer = new MutationObserver((records) => {
      const outside = records.some((r) => {
        const node = r.target instanceof Element ? r.target : r.target.parentElement;
        return !node?.closest(".tourl-root");
      });
      if (outside) bump();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "hidden", "style", "aria-expanded", "data-tour"],
    });
    window.addEventListener("resize", bump);
    document.addEventListener("input", bump, true);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", bump);
      document.removeEventListener("input", bump, true);
    };
  }, []);
  return tick;
}

function visible(el: Element): boolean {
  return el.getClientRects().length > 0;
}

function query(selector: string): HTMLElement | null {
  const found = [...document.querySelectorAll<HTMLElement>(selector)].find(visible);
  return found ?? null;
}

const anchorSelector = (anchor: string) => `[data-tour="${anchor}"]`;

function buildContext(
  path: string,
  extra: Pick<MarkContext, "athleteId" | "athleteName" | "pendingName" | "summarySeen">,
): MarkContext {
  return {
    path,
    has: (anchor) => query(anchorSelector(anchor)) !== null,
    count: (anchor) => [...document.querySelectorAll(anchorSelector(anchor))].filter(visible).length,
    value: (selector) => document.querySelector<HTMLInputElement>(selector)?.value.trim() ?? "",
    ...extra,
  };
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

// Posición del elemento resaltado: se recalcula al desplazar, al cambiar el
// tamaño y cuando el propio elemento cambia de medida.
function useRect(el: HTMLElement | null, tick: number): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);
  const measure = useCallback(() => {
    if (!el) return setRect(null);
    const r = el.getBoundingClientRect();
    setRect((prev) =>
      prev && prev.left === r.left && prev.top === r.top && prev.width === r.width && prev.height === r.height
        ? prev
        : { left: r.left, top: r.top, width: r.width, height: r.height },
    );
  }, [el]);
  useLayoutEffect(measure, [measure, tick]);
  useEffect(() => {
    if (!el) return;
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(el);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, [el, measure]);
  return rect;
}

interface Placement {
  left: number;
  top: number;
  width: number;
  side: "below" | "above" | "left" | "right" | "bottom" | "top";
  arrow: number;
}

function place(rect: Rect, height: number): Placement {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw <= MOBILE) {
    const width = vw - 16;
    const top = rect.top + rect.height / 2 > vh / 2;
    return { left: 8, top: top ? 8 : vh - height - 8, width, side: top ? "top" : "bottom", arrow: 0 };
  }
  const width = vw <= TABLET ? 260 : 280;
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(n, max));
  const left = clamp(rect.left + rect.width / 2 - width / 2, 8, vw - width - 8);
  const arrow = clamp(rect.left + rect.width / 2 - left, 16, width - 16);
  const below = rect.top + rect.height + 12;
  if (below + height <= vh - 8) return { left, top: below, width, side: "below", arrow };
  const above = rect.top - height - 12;
  if (above >= 8) return { left, top: above, width, side: "above", arrow };
  const top = clamp(rect.top, 8, vh - height - 8);
  if (rect.left - width - 12 >= 8) return { left: rect.left - width - 12, top, width, side: "left", arrow: 0 };
  if (rect.left + rect.width + 12 + width <= vw - 8) return { left: rect.left + rect.width + 12, top, width, side: "right", arrow: 0 };
  return { left: vw - width - 8, top: vh - height - 8, width, side: "bottom", arrow: 0 };
}

interface MarkViewProps {
  mark: Mark;
  ctx: MarkContext;
  el: HTMLElement;
  tick: number;
  canSkip: boolean;
  saving: boolean;
  onNext: () => void;
  onSkip: () => void;
  onBack: (() => void) | null;
  onExit: () => void;
  onPause: () => void;
}

function MarkView({ mark, ctx, el, tick, canSkip, saving, onNext, onSkip, onBack, onExit, onPause }: MarkViewProps) {
  const rect = useRect(el, tick);
  const balloonRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(120);
  const liveId = useId();
  const text = mark.text(ctx);

  // Si el elemento queda fuera de la vista, se desplaza hasta él.
  useEffect(() => {
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) {
      el.scrollIntoView({ block: "center", inline: "center" });
    }
  }, [el, mark.id]);

  // El lector de pantalla asocia la instrucción al elemento resaltado.
  useEffect(() => {
    const previous = el.getAttribute("aria-describedby");
    el.setAttribute("aria-describedby", [previous, liveId].filter(Boolean).join(" "));
    return () => {
      if (previous) el.setAttribute("aria-describedby", previous);
      else el.removeAttribute("aria-describedby");
    };
  }, [el, liveId]);

  useLayoutEffect(() => {
    const h = balloonRef.current?.offsetHeight;
    if (h && h !== height) setHeight(h);
  });

  // Teclado con el foco en el globo: Esc pausa; → siguiente; ← vuelve atrás.
  // Alt + G lleva el foco al globo desde cualquier parte.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.altKey && event.key.toLowerCase() === "g") {
        event.preventDefault();
        balloonRef.current?.focus();
        return;
      }
      if (!balloonRef.current?.contains(document.activeElement) && document.activeElement !== balloonRef.current) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onPause();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        if (mark.manual) onNext();
        else if (canSkip && !mark.closing) onSkip();
      } else if (event.key === "ArrowLeft" && onBack) {
        event.preventDefault();
        onBack();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mark, canSkip, onNext, onSkip, onBack, onPause]);

  if (!rect) return null;
  const placement = place(rect, height);
  const radius = window.getComputedStyle(el).borderTopLeftRadius || "8px";

  return (
    <>
      <div
        className="tourl-halo"
        aria-hidden="true"
        style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8, borderRadius: radius }}
      />
      <div
        ref={balloonRef}
        className={`tourl-balloon tourl-${placement.side}`}
        role="complementary"
        aria-label="Guía de inicio"
        tabIndex={-1}
        style={{ left: placement.left, top: placement.top, width: placement.width, ["--arrow" as string]: `${placement.arrow}px` }}
      >
        <p className="tourl-meta">
          {mark.level ? `${mark.level} · ` : ""}Paso {mark.step} de {TOUR_STEP_COUNT}
        </p>
        <p className="tourl-text">{text}</p>
        <div className="tourl-actions">
          {mark.closing && (
            <button type="button" className="tourl-btn" disabled={saving} onClick={onNext}>
              Entendido
            </button>
          )}
          {mark.manual && (
            <button type="button" className="tourl-btn" onClick={onNext}>
              Siguiente
            </button>
          )}
          {canSkip && !mark.closing && (
            <button type="button" className="tourl-link" onClick={onSkip}>
              Saltar paso
            </button>
          )}
          <button type="button" className="tourl-link" disabled={saving} onClick={onExit}>
            Salir de la guía
          </button>
        </div>
      </div>
      <div id={liveId} className="tour-sr" aria-live="polite">
        Paso {mark.step} de {TOUR_STEP_COUNT}. {text}
      </div>
    </>
  );
}

// Ficha pequeña abajo a la izquierda cuando no hay marca: espera, pausa o
// coach fuera del camino.
function Chip({ children, action, onAction, onExit, saving }: { children: React.ReactNode; action: string; onAction: () => void; onExit: () => void; saving: boolean }) {
  return (
    <div className="tourl-chip" role="status">
      <span>{children}</span>
      <button type="button" className="tourl-btn tourl-btn-sm" onClick={onAction}>
        {action}
      </button>
      <button type="button" className="tourl-link" disabled={saving} onClick={onExit}>
        Salir
      </button>
    </div>
  );
}

// Guía de primer uso de la coach (CYC-214): una capa sobre la interfaz real que
// resalta el elemento del paso y lo explica en un globo corto. Se monta en el
// diseño de la app y no cambia el aspecto de las pantallas.
export function TourLayer() {
  const { user } = useAuth();
  if (user?.role !== "coach") return null;
  return <CoachLayer />;
}

function CoachLayer() {
  const tour = useTour();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tick = useDomTick();
  const { active, started, progress } = tour;
  const current = progress.current;

  // Sin pasos por hacer: la guía termina sola.
  useEffect(() => {
    if (active && started && current === null && !tour.saving) void tour.finish("completed");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, started, current]);

  // Tocar el elemento de una marca que lo pide ya la cumple.
  useEffect(() => {
    if (!active || !started) return;
    function onClick(event: MouseEvent) {
      const target = event.target as Element | null;
      if (target?.closest(anchorSelector("view-summary"))) tour.markSummarySeen();
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [active, started, tour]);

  if (!active) return null;
  if (!started) return createPortal(<TourIntro onStart={tour.begin} onLater={() => void tour.finish("skipped")} saving={tour.saving} />, document.body);
  if (current === null) return null;

  const ctx = buildContext(pathname, {
    athleteId: tour.firstActiveAthlete?.id ?? null,
    athleteName: tour.firstActiveAthlete?.name ?? null,
    pendingName: tour.pendingAthlete?.name ?? null,
    summarySeen: tour.summarySeen,
  });
  const exit = () => void tour.finish("skipped");
  const stepLabel = `Guía · Paso ${current} de ${TOUR_STEP_COUNT}`;
  const mark = tour.paused || progress.waiting ? null : pickMark(current, ctx);
  const el = mark ? query(mark.selector(ctx)) : null;

  let body: React.ReactNode;
  if (tour.paused) {
    body = (
      <Chip action="Seguir" onAction={() => tour.setPaused(false)} onExit={exit} saving={tour.saving}>
        Guía en pausa · Paso {current} de {TOUR_STEP_COUNT}
      </Chip>
    );
  } else if (progress.waiting) {
    body = (
      <Chip action="Seguir" onAction={() => navigate("/athletes")} onExit={exit} saving={tour.saving}>
        {stepLabel} · Esperando a {tour.pendingAthlete?.name ?? "tu atleta"}
      </Chip>
    );
  } else if (mark && el) {
    const closing = mark.closing === true;
    body = (
      <MarkView
        mark={mark}
        ctx={ctx}
        el={el}
        tick={tick}
        canSkip={!closing}
        saving={tour.saving}
        onNext={() => {
          if (closing) void tour.finish("completed").then(() => navigate("/", { replace: true }));
          else tour.markSummarySeen();
        }}
        onSkip={() => tour.skipStep(current as TourStepN)}
        onBack={tour.skippedCount > 0 ? tour.unskipLast : null}
        onExit={exit}
        onPause={() => tour.setPaused(true)}
      />
    );
  } else {
    body = (
      <Chip action={`Volver al paso ${current}`} onAction={() => navigate(stepPath(current, ctx.athleteId))} onExit={exit} saving={tour.saving}>
        {stepLabel}
      </Chip>
    );
  }

  return createPortal(<div className="tourl-root">{body}</div>, document.body);
}
