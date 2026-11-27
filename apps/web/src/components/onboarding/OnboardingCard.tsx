import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { PATTERNS } from "../../assets/patterns";

const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// Una animación puede no terminar (por ejemplo, con la pestaña sin dibujarse): el registro no
// espera más que esto para avanzar.
const settled = (animation: Animation, ms: number) =>
  Promise.race([animation.finished.catch(() => undefined), new Promise((resolve) => window.setTimeout(resolve, ms))]);

function ProgressBar({ percent }: { percent: number }) {
  const [shown, setShown] = useState(percent);
  const from = useRef(percent);
  // El número cuenta hasta el nuevo %.
  useEffect(() => {
    const start = from.current;
    from.current = percent;
    if (calm() || start === percent) return setShown(percent);
    const t0 = performance.now();
    let frame = 0;
    const tick = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - t0) / 600));
      setShown(Math.round(start + (percent - start) * k));
      if (k < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [percent]);
  return (
    <div className="ob-prog">
      <div className="ob-track" role="progressbar" aria-label="Avance del registro" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <i style={{ width: `${percent}%` }} />
      </div>
      <b aria-hidden="true">{shown} %</b>
    </div>
  );
}

// Cambia de paso con la transición del diseño: la pantalla actual sale hacia un lado, la barra avanza
// y la siguiente entra desde el otro. Con «reducir movimiento» el cambio es inmediato.
export function useStepTransition(apply: (to: number) => void) {
  const slot = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const enter = useRef(0);

  async function go(to: number, direction: 1 | -1) {
    if (busy.current) return;
    const el = slot.current;
    if (!el?.animate || calm()) return apply(to);
    busy.current = true;
    const out = el.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: `translateX(${-40 * direction}px)` }], { duration: 190, easing: "ease-in", fill: "forwards" });
    await settled(out, 400);
    enter.current = direction;
    apply(to);
    out.cancel();
  }

  // Al montar el paso nuevo entra desde el lado contrario.
  function entered() {
    const el = slot.current;
    const direction = enter.current;
    if (!el?.animate || !direction) {
      busy.current = false;
      return;
    }
    enter.current = 0;
    el.querySelectorAll(".ob-opt").forEach((option, i) =>
      option.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 260, delay: 120 + Math.min(i, 14) * 28, easing: "ease-out", fill: "backwards" }),
    );
    const done = el.animate([{ opacity: 0, transform: `translateX(${40 * direction}px)` }, { opacity: 1, transform: "none" }], { duration: 300, easing: "cubic-bezier(.2,.8,.2,1)" });
    void settled(done, 600).then(() => (busy.current = false));
  }

  return { slot, go, entered };
}

// La tarjeta del registro por pasos: escenario arriba, barra de avance y contenido, sobre la trama
// borrosa. La barra permanece y solo cambia lo demás.
export function OnboardingCard({
  stage,
  percent,
  step,
  transition,
  announce,
  links,
  overlay,
  children,
}: {
  stage: ReactNode;
  percent: number;
  step: number;
  transition: ReturnType<typeof useStepTransition>;
  announce: string;
  // Salidas bajo la tarjeta («Mi cuenta», «Cerrar sesión»).
  links?: ReactNode;
  // Encima de la app, borrosa, como las novedades (la encuesta).
  overlay?: boolean;
  children: ReactNode;
}) {
  const card = useRef<HTMLDivElement>(null);
  const height = useRef(0);
  const first = useRef(true);

  // La tarjeta acomoda su alto sin saltos y el foco va al título de cada paso.
  useLayoutEffect(() => {
    const el = card.current;
    if (!el) return;
    const next = el.offsetHeight;
    if (!first.current) {
      if (el.animate && !calm() && height.current && height.current !== next) {
        el.animate([{ height: `${height.current}px` }, { height: `${next}px` }], { duration: 320, easing: "cubic-bezier(.2,.8,.2,1)" });
      }
      transition.slot.current?.querySelector<HTMLElement>("h1")?.focus();
    }
    first.current = false;
    transition.entered();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);
  useLayoutEffect(() => {
    height.current = card.current?.offsetHeight ?? 0;
  });

  const content = (
    <>
      <div className="ob-card" ref={card}>
        {stage}
        <ProgressBar percent={percent} />
        <div className="ob-slot" ref={transition.slot}>
          {children}
        </div>
        {links && <div className="ob-out">{links}</div>}
      </div>
      <p className="sr-only" role="status">
        {announce}
      </p>
    </>
  );

  if (overlay) return <div className="ob-wrap">{content}</div>;
  return (
    <div className="ob-shell">
      <div className="ob-bg" style={{ backgroundImage: `url(${PATTERNS.a})` }} aria-hidden="true" />
      <main className="ob-wrap">{content}</main>
    </div>
  );
}
