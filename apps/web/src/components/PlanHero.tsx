import { Link } from "react-router-dom";
import { HERO_PATTERN } from "../assets/patterns";
import { HeroKind, PlanStats } from "../lib/planGrid";
import { firstName } from "../lib/coachHome";
import { formatShortDate } from "../lib/format";

interface PlanHeroProps {
  kind: HeroKind;
  stats: PlanStats;
  weeks: number;
  currentWeek: number;
  startDate: string;
  isCoach: boolean;
  athlete: { id: string; name: string } | null;
}

// Cadena de semanas: una cuenta por semana, llena hasta la semana en curso.
// Con muchas semanas se quitan los conectores para que no se desborde.
function WeekChain({ weeks, currentWeek }: { weeks: number; currentWeek: number }) {
  const items = [];
  for (let week = 1; week <= weeks; week++) {
    const cls = week < currentWeek ? "pl-chain-bead pl-chain-done" : week === currentWeek ? "pl-chain-bead pl-chain-now" : "pl-chain-bead";
    items.push(<i key={`b${week}`} className={cls} />);
    if (weeks <= 12 && week < weeks) {
      items.push(<u key={`u${week}`} className={week < currentWeek ? "pl-chain-link pl-chain-done" : "pl-chain-link"} />);
    }
  }
  return (
    <div className="pl-chain" role="img" aria-label={`Semana ${currentWeek} de ${weeks}`}>
      {items}
    </div>
  );
}

// Tarjeta oscura de arriba del plan: en qué semana va y cuántas sesiones lleva.
export function PlanHero({ kind, stats, weeks, currentWeek, startDate, isCoach, athlete }: PlanHeroProps) {
  const name = athlete ? firstName(athlete.name) : null;
  return (
    <section className="hm-hero" aria-label="Avance del plan">
      <div className="hm-hero-art" style={{ backgroundImage: `url(${HERO_PATTERN})` }} aria-hidden="true" />
      <div className="hm-hero-body">
        {kind === "empty" && (
          <>
            <p className="hm-hero-big hm-hero-big-text">{isCoach ? "Arma el primer ciclo" : "Todavía sin sesiones"}</p>
            <p className="hm-hero-line">
              {isCoach
                ? `Asigna una rutina a cada sesión. Cuando el plan esté activo, ${name ?? "tu atleta"} las verá en su celular.`
                : "Tu coach aún no asigna rutinas a este plan."}
            </p>
          </>
        )}
        {kind === "upcoming" && (
          <>
            <p className="hm-hero-big hm-hero-big-text">Empieza el {formatShortDate(startDate)}</p>
            <p className="hm-hero-line">
              {stats.assigned} {stats.assigned === 1 ? "sesión asignada" : "sesiones asignadas"}.
            </p>
          </>
        )}
        {kind === "running" && (
          <>
            <p className="hm-hero-big">
              {currentWeek}
              <small>de {weeks} semanas</small>
            </p>
            <WeekChain weeks={weeks} currentWeek={currentWeek} />
            <p className="hm-hero-line">
              {stats.weekAssigned > 0
                ? `Esta semana lleva ${stats.weekCompleted} de ${stats.weekAssigned} sesiones. `
                : "Esta semana no tiene sesiones asignadas. "}
              En total, {stats.completed} de {stats.assigned} completadas.
            </p>
          </>
        )}
        {kind === "ended" && (
          <>
            <p className="hm-hero-big hm-hero-big-text">El plan terminó</p>
            <WeekChain weeks={weeks} currentWeek={weeks + 1} />
            <p className="hm-hero-line">
              En total, {stats.completed} de {stats.assigned} sesiones completadas.
            </p>
          </>
        )}
        {isCoach && athlete && kind !== "empty" && (
          <Link className="hm-hero-cta" to={`/athletes/${athlete.id}`}>
            Ver resumen de {name}
          </Link>
        )}
      </div>
    </section>
  );
}
