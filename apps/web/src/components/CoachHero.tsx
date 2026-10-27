import { Link } from "react-router-dom";

interface CoachHeroProps {
  attentionCount: number;
  hasAthletes: boolean;
  // Sesiones de hoy entre todos los atletas; null si todavía se están cargando.
  today: { planned: number; done: number } | null;
}

// Franja oscura de arriba del Inicio: cuántas sesiones hay hoy y cuántos
// atletas necesitan atención. Con tres estados: con atletas, sin atletas y
// cargando (docs/diseno/ciclo-en-calendario).
export function CoachHero({ attentionCount, hasAthletes, today }: CoachHeroProps) {
  if (!hasAthletes) {
    return (
      <section className="cy-strip" aria-label="Resumen de tus atletas">
        <b className="cy-strip-title">Empieza invitando a un atleta</b>
        <p className="cy-strip-line">Cuando acepte tu invitación, aquí verás cómo le va.</p>
        <Link className="cy-strip-cta" to="/athletes">
          Invitar atleta
        </Link>
      </section>
    );
  }

  const attention =
    attentionCount === 0
      ? "Ningún atleta necesita tu atención."
      : attentionCount === 1
        ? "1 atleta necesita tu atención."
        : `${attentionCount} atletas necesitan tu atención.`;

  if (!today) return null;

  const title = today.planned === 0 ? "Hoy no hay sesiones" : today.planned === 1 ? "1 sesión hoy" : `${today.planned} sesiones hoy`;
  const progress =
    today.planned === 0
      ? ""
      : today.done === 0
        ? "Ninguna completada todavía. "
        : `${today.done} de ${today.planned} completadas. `;

  return (
    <section className="cy-strip" aria-label="Resumen de tus atletas">
      <b className="cy-strip-title">{title}</b>
      <p className="cy-strip-line">
        {progress}
        {attention}
      </p>
    </section>
  );
}
