import { Link } from "react-router-dom";
import type { TourProgress } from "../../lib/tour";

interface TourCardProps {
  progress: TourProgress;
  // Atleta invitado que aún no acepta (paso 3) y atleta que ya aceptó (paso 4).
  waitingFor: string | null;
  athleteId: string | null;
  athleteName: string | null;
  onSkip: () => void;
  onPause: () => void;
}

const DESTINATION: Record<1 | 2, string> = { 1: "/biblioteca", 2: "/athletes" };
const CTA: Record<1 | 2 | 4, string> = { 1: "Crear rutina", 2: "Invitar atleta", 4: "Crear ciclo" };

// Tarjeta «Empieza con Cycles» del Inicio: los cuatro pasos con su marca de
// hecho y el siguiente resaltado. Reemplaza la franja «Empieza invitando a un
// atleta» mientras la guía está activa.
export function TourCard({ progress, waitingFor, athleteId, athleteName, onSkip, onPause }: TourCardProps) {
  const { steps, current } = progress;
  const waiting = current === 3;
  const returned = current === 4 && athleteName;

  return (
    <section className="tour-card" aria-label="Empieza con Cycles">
      <div className="tour-card-head">
        <h2>
          {waiting
            ? `Esperando a ${waitingFor ?? "tu atleta"}`
            : returned
              ? `${athleteName} ya aceptó. Crea su ciclo.`
              : "Empieza con Cycles"}
        </h2>
        <button type="button" className="tour-link" onClick={onSkip}>
          No quiero la guía
        </button>
      </div>

      <ol className="tour-steps">
        {steps.map((step) => (
          <li key={step.n} className={step.done ? "tour-step tour-step-done" : step.n === current ? "tour-step tour-step-current" : "tour-step"}>
            <span className="tour-step-mark" aria-hidden="true">
              {step.done ? "✓" : step.n}
            </span>
            <span className="tour-step-text">
              {step.title}
              {step.done && <span className="tour-step-hecho"> · Hecho</span>}
              {step.n === current && !step.done && <span className="tour-sr"> (siguiente paso)</span>}
            </span>
          </li>
        ))}
      </ol>

      <div className="tour-card-actions">
        {current === 1 && (
          <Link className="button-primary tour-cta" to={DESTINATION[1]}>
            {CTA[1]}
          </Link>
        )}
        {current === 2 && (
          <Link className="button-primary tour-cta" to={DESTINATION[2]}>
            {CTA[2]}
          </Link>
        )}
        {current === 3 && (
          <>
            <p className="tour-note">Tu atleta tiene hasta 7 días para aceptar la invitación. Puedes ver el estado en Atletas.</p>
            <Link className="button-secondary tour-cta" to="/athletes">
              Ver invitaciones
            </Link>
            <button type="button" className="button-secondary tour-cta" onClick={onPause}>
              Seguir con la app
            </button>
          </>
        )}
        {current === 4 && athleteId && (
          <Link className="button-primary tour-cta" to={`/athletes/${athleteId}`}>
            {CTA[4]}
          </Link>
        )}
      </div>
    </section>
  );
}
