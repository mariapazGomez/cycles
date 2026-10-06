import { useEffect, useRef } from "react";
import { CHAIN_STRANDS } from "../../assets/patterns/chain-strands";

// Cadena de proteína viva (motivo de marca, ver docs/brand/identidad-visual.md):
// las perlas flotan suavemente y una onda de energía recorre cada hebra. Se
// dibuja en un lienzo que ocupa todo su contenedor (que debe tener
// position: relative y overflow: hidden), siempre detrás de tarjetas opacas.
// Solo se anima mientras está a la vista y no se anima con "reducir movimiento".
export function ChainCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !host || !ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let visible = true;
    let raf = 0;
    let last = 0;

    const size = () => {
      const rect = host.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    };

    const draw = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      // El lienzo original mide 1440 × 900 y se recorta al centro ("slice").
      const k = Math.max(width / 1440, height / 900);
      const ox = (width - 1440 * k) / 2;
      const oy = (height - 900 * k) / 2;
      CHAIN_STRANDS.forEach((strand, si) => {
        const pts = strand.map((b, i) => {
          const phase = i * 0.07 + si * 2.1;
          return [ox + (b[0] + Math.sin(t * 0.6 + phase) * 3.5) * k, oy + (b[1] + Math.cos(t * 0.8 + phase * 1.1) * 5) * k];
        });
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.strokeStyle = "rgba(48,128,252,.28)";
        ctx.lineWidth = 2.4 * k;
        ctx.lineJoin = "round";
        ctx.stroke();
        for (let i = 0; i < strand.length; i++) {
          const p = pts[i];
          if (p[0] < -24 || p[0] > width + 24 || p[1] < -24 || p[1] > height + 24) continue;
          // Onda de energía: crece y se ilumina al pasar.
          let wave = Math.max(0, Math.sin(t * 1.1 - i * 0.1 + si * 1.7));
          wave *= wave;
          ctx.beginPath();
          ctx.arc(p[0], p[1], strand[i][2] * k * (1 + 0.22 * wave), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(48,128,252,${Math.min(1, strand[i][3] + 0.3 * wave)})`;
          ctx.fill();
        }
      });
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden || now - last < 33) return;
      last = now;
      draw(now / 1000);
    };

    size();
    draw(0);
    const resize = new ResizeObserver(() => {
      size();
      draw(last / 1000);
    });
    resize.observe(host);
    let seen: IntersectionObserver | undefined;
    if (!reduce) {
      seen = new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
      });
      seen.observe(host);
      raf = requestAnimationFrame(frame);
    }
    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      seen?.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="lp-chain-canvas" aria-hidden="true" />;
}
