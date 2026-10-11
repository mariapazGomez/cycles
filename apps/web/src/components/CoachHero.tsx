import { Link } from "react-router-dom";
import { HERO_PATTERN } from "../assets/patterns";
import { firstLine, firstName } from "../lib/coachHome";
import type { AttentionItem } from "../services/trackingApi";

interface CoachHeroProps {
  attentionCount: number;
  first: AttentionItem | null;
  hasAthletes: boolean;
}

// Tarjeta oscura de arriba del Inicio: dice cuántos atletas necesitan atención
// y por quién empezar. Tiene tres estados: con avisos, todo al día y sin
// atletas todavía.
export function CoachHero({ attentionCount, first, hasAthletes }: CoachHeroProps) {
  return (
    <section className="hm-hero" aria-label="Resumen de tus atletas">
      <div className="hm-hero-art" style={{ backgroundImage: `url(${HERO_PATTERN})` }} aria-hidden="true" />
      <div className="hm-hero-body">
        {first ? (
          <>
            <p className="hm-hero-big">
              {attentionCount}
              <small>{attentionCount === 1 ? "atleta necesita tu atención" : "atletas necesitan tu atención"}</small>
            </p>
            <p className="hm-hero-line">
              Empieza por <b>{first.athlete.name}</b>: {firstLine(first.kind)}
            </p>
            <Link className="hm-hero-cta" to={`/athletes/${first.athlete.id}`}>
              Ver a {firstName(first.athlete.name)}
            </Link>
          </>
        ) : hasAthletes ? (
          <>
            <p className="hm-hero-big">Todo al día</p>
            <p className="hm-hero-line">Ningún atleta necesita tu atención ahora.</p>
          </>
        ) : (
          <>
            <p className="hm-hero-big hm-hero-big-text">Empieza invitando a un atleta</p>
            <p className="hm-hero-line">Cuando acepte tu invitación, aquí verás cómo le va.</p>
            <Link className="hm-hero-cta" to="/athletes">
              Invitar atleta
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
