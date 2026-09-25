import { useEffect, useRef, useState } from "react";

// Cuenta regresiva de descanso entre series: un anillo que se llena a medida
// que pasa el tiempo. Se calcula contra la hora de término (no contando
// segundos), así sigue siendo exacta si el celular bloquea la pantalla o la
// pestaña queda en segundo plano.

const RADIUS = 100;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

interface RestTimerProps {
  endsAt: number;
  totalSeconds: number;
  label: string;
  onAdjust: (deltaSeconds: number) => void;
  onSkip: () => void;
  onFinish: () => void;
}

export function RestTimer({ endsAt, totalSeconds, label, onAdjust, onSkip, onFinish }: RestTimerProps) {
  const [now, setNow] = useState(() => Date.now());
  const finished = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  // Mantener la pantalla encendida durante el descanso, si el navegador lo permite.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock
      ?.request("screen")
      .then((l) => {
        lock = l;
      })
      .catch(() => undefined);
    return () => {
      lock?.release().catch(() => undefined);
    };
  }, []);

  const remaining = Math.max(0, (endsAt - now) / 1000);
  const progress = totalSeconds > 0 ? Math.min(1, 1 - remaining / totalSeconds) : 1;

  useEffect(() => {
    if (remaining <= 0 && !finished.current) {
      finished.current = true;
      navigator.vibrate?.([200, 100, 200]);
      onFinish();
    }
  }, [remaining, onFinish]);

  return (
    <section className="rest-timer" aria-label="Descanso">
      <h2 className="section-title">{label}</h2>
      <div className="rest-ring">
        <svg viewBox="0 0 232 232" aria-hidden="true">
          <circle className="rest-ring-track" cx="116" cy="116" r={RADIUS} />
          <circle
            className="rest-ring-progress"
            cx="116"
            cy="116"
            r={RADIUS}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          />
        </svg>
        <div className="rest-ring-center" role="timer" aria-label={`Quedan ${formatClock(Math.ceil(remaining))} de descanso`}>
          <span className="rest-ring-time">{formatClock(Math.ceil(remaining))}</span>
          <span className="rest-ring-total">de {formatClock(totalSeconds)}</span>
        </div>
      </div>
      <div className="rest-adjust">
        <button type="button" className="button-secondary" onClick={() => onAdjust(-15)}>
          −15 s
        </button>
        <button type="button" className="button-secondary" onClick={() => onAdjust(15)}>
          +15 s
        </button>
      </div>
      <button type="button" className="button-secondary button-big" onClick={onSkip}>
        Saltar descanso
      </button>
    </section>
  );
}
