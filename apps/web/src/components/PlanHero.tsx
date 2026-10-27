import { Link } from "react-router-dom";
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
export function WeekChain({ weeks, currentWeek }: { weeks: number; currentWeek: number }) {
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

// Franja oscura de arriba del ciclo: en qué semana va y cuántas sesiones lleva.
// Es delgada para que el calendario quede a la vista (docs/diseno/ciclo-en-calendario).
export function PlanHero({ kind, stats, weeks, currentWeek, startDate, isCoach, athlete }: PlanHeroProps) {
  const name = athlete ? firstName(athlete.name) : null;
  return (
    <section className="cy-strip" aria-label="Avance del ciclo">
      {kind === "empty" && (
        <>
          <b className="cy-strip-title">{isCoach ? "Ciclo nuevo" : "Todavía sin sesiones"}</b>
          <p className="cy-strip-line">
            {isCoach
              ? `Toca un día para asignarle una rutina. ${name ?? "Tu atleta"} la verá en su celular apenas la asignes.`
              : "Tu coach aún no asigna rutinas a este ciclo."}
          </p>
        </>
      )}
      {kind === "upcoming" && (
        <>
          <b className="cy-strip-title">Empieza el {formatShortDate(startDate)}</b>
          <p className="cy-strip-line">
            {stats.assigned} {stats.assigned === 1 ? "sesión asignada" : "sesiones asignadas"}.
          </p>
        </>
      )}
      {kind === "running" && (
        <>
          <div className="cy-strip-week">
            <b className="cy-strip-title">Semana {currentWeek}</b>
            <span>de {weeks}</span>
          </div>
          <WeekChain weeks={weeks} currentWeek={currentWeek} />
          <p className="cy-strip-line">
            {stats.weekAssigned > 0
              ? `Esta semana lleva ${stats.weekCompleted} de ${stats.weekAssigned} sesiones. `
              : "Esta semana no tiene sesiones asignadas. "}
            En total, {stats.completed} de {stats.assigned} completadas.
          </p>
        </>
      )}
      {kind === "ended" && (
        <>
          <b className="cy-strip-title">El ciclo terminó</b>
          <WeekChain weeks={weeks} currentWeek={weeks + 1} />
          <p className="cy-strip-line">
            En total, {stats.completed} de {stats.assigned} sesiones completadas.
          </p>
        </>
      )}
      {isCoach && athlete && kind !== "empty" && (
        <Link className="cy-strip-cta" to={`/athletes/${athlete.id}`}>
          Ver resumen
        </Link>
      )}
    </section>
  );
}
