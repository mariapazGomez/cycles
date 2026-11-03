import { useState } from "react";
import { Link } from "react-router-dom";
import { useTour } from "../../hooks/useTour";
import { useAuth } from "../../hooks/useAuth";
import { TourDialog } from "./TourDialog";
import { CycleDiagram } from "./TourIntro";

const MANUAL = "https://github.com/mariapazGomez/cycles/blob/main/docs/MANUAL-COACH.md";

// «Cómo usar Cycles», desde el menú de usuario. La coach ve sus cuatro pasos
// con su estado; la atleta, las tres explicaciones de su app.
export function GuidePanel({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  return user?.role === "coach" ? <CoachGuide onClose={onClose} /> : <AthleteGuide onClose={onClose} />;
}

function CoachGuide({ onClose }: { onClose: () => void }) {
  const tour = useTour(true);
  const [diagram, setDiagram] = useState(false);
  return (
    <TourDialog title="Cómo usar Cycles" onClose={onClose}>
      <ol className="tour-steps">
        {tour.progress.steps.map((step) => (
          <li key={step.n} className={step.done ? "tour-step tour-step-done" : "tour-step"}>
            <span className="tour-step-mark" aria-hidden="true">
              {step.done ? "✓" : step.n}
            </span>
            <span className="tour-step-text">
              {step.title}
              {step.done && <span className="tour-step-hecho"> · Hecho</span>}
              {step.skipped && <span className="tour-step-hecho"> · Saltado</span>}
            </span>
          </li>
        ))}
      </ol>
      {diagram && (
        <div className="tour-diagram-wrap">
          <CycleDiagram />
          <p>Un ciclo organiza las semanas de tu atleta. Contiene rutinas, y cada rutina contiene ejercicios.</p>
        </div>
      )}
      <div className="tour-dialog-actions">
        <button
          type="button"
          className="button-primary"
          data-autofocus
          disabled={tour.saving}
          onClick={async () => {
            await tour.reopen();
            onClose();
          }}
        >
          Volver a ver la guía
        </button>
        <button type="button" className="button-secondary" aria-expanded={diagram} onClick={() => setDiagram((v) => !v)}>
          Cómo se piensa un ciclo
        </button>
        <a className="button-secondary" href={MANUAL} target="_blank" rel="noreferrer">
          Abrir el manual
        </a>
        <button type="button" className="tour-link" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </TourDialog>
  );
}

function AthleteGuide({ onClose }: { onClose: () => void }) {
  return (
    <TourDialog title="Cómo usar Cycles" onClose={onClose}>
      <AthleteSteps />
      <div className="tour-dialog-actions">
        <Link className="button-primary" to="/" onClick={onClose} data-autofocus>
          Ir a Hoy
        </Link>
        <button type="button" className="tour-link" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </TourDialog>
  );
}

// Las tres explicaciones del atleta: las mismas de la app, escritas para la web.
export function AthleteSteps() {
  return (
    <ul className="tour-athlete-list">
      <li>
        <b>Hoy:</b> aquí está tu sesión de hoy. Toca <b>Empezar sesión</b> cuando vayas a entrenar.
      </li>
      <li>
        <b>Calendario:</b> ves tu semana y todo tu ciclo.
      </li>
      <li>
        <b>Mis ciclos:</b> los ciclos que tu coach te asignó, con tu avance.
      </li>
    </ul>
  );
}
