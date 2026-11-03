import { useNavigate } from "react-router-dom";
import { useTour } from "../../hooks/useTour";
import { TourCard } from "./TourCard";
import { TourDialog } from "./TourDialog";

// Lo que la guía agrega al Inicio de la coach: la bienvenida (una vez), la
// tarjeta con los cuatro pasos y el cierre cuando asigna la primera sesión.
// Devuelve `null` cuando la guía no está activa, y el Inicio muestra lo de siempre.
export function CoachTour() {
  const tour = useTour();
  const navigate = useNavigate();
  const { active, started, progress } = tour;
  if (!active) return null;

  // Cierre: los cuatro pasos hechos.
  if (started && progress.current === null) {
    const done = async () => {
      await tour.finish("completed");
      navigate("/", { replace: true });
    };
    return (
      <TourDialog title="Tu atleta ya puede entrenar" onClose={() => void done()}>
        <p>
          El ciclo está activo y {tour.firstActiveAthlete?.name ?? "tu atleta"} verá su primera sesión en Hoy. Desde Inicio ves quién necesita tu atención.
        </p>
        <div className="tour-dialog-actions">
          <button type="button" className="button-primary" data-autofocus disabled={tour.saving} onClick={() => void done()}>
            Ir a Inicio
          </button>
        </div>
      </TourDialog>
    );
  }

  // Bienvenida: solo antes de empezar.
  if (!started) {
    return (
      <TourDialog title="Te damos la bienvenida a Cycles" onClose={() => void tour.finish("skipped")}>
        <p>Vamos a dejar a tu atleta listo para entrenar. Son cuatro pasos y puedes salir cuando quieras.</p>
        <div className="tour-dialog-actions">
          <button type="button" className="button-primary" data-autofocus onClick={tour.begin}>
            Empezar
          </button>
          <button type="button" className="button-secondary" disabled={tour.saving} onClick={() => void tour.finish("skipped")}>
            Ahora no
          </button>
        </div>
      </TourDialog>
    );
  }

  return (
    <TourCard
      progress={progress}
      waitingFor={tour.pendingAthlete?.name ?? null}
      athleteId={tour.firstActiveAthlete?.id ?? null}
      athleteName={tour.firstActiveAthlete?.name ?? null}
      onSkip={() => void tour.finish("skipped")}
      onPause={() => navigate("/biblioteca")}
    />
  );
}
