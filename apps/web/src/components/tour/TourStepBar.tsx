import { Link } from "react-router-dom";
import { useTour } from "../../hooks/useTour";
import { TOUR_BAR_TEXT } from "../../lib/tour";

// Barra fija bajo el encabezado, en las pantallas donde se hace cada paso:
// «Paso N de 4», la instrucción y «Salir». No sale en el Inicio, donde está la tarjeta.
export function TourStepBar() {
  const tour = useTour();
  const { active, started, progress } = tour;
  if (!active || !started || progress.current === null) return null;
  const n = progress.current;

  return (
    <section className="tour-bar" aria-label="Guía de inicio">
      <b>Paso {n} de 4</b>
      <span className="tour-bar-text">
        {TOUR_BAR_TEXT[n]}
        {n === 1 && (
          <>
            {" "}
            Si falta un ejercicio, créalo desde el buscador con <b>Crear</b>.
          </>
        )}
        {n === 3 && (
          <>
            {" "}
            <Link to="/athletes">Ver invitaciones</Link>
          </>
        )}
      </span>
      <button type="button" className="tour-link" onClick={() => void tour.finish("skipped")} disabled={tour.saving}>
        Salir
      </button>
    </section>
  );
}
