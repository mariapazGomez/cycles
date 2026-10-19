import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { TrainingCycle, TrainingSession } from "@cycles/shared";
import * as sessionsApi from "../services/sessionsApi";
import { dueNow, weekCount, weekIsComplete } from "../lib/athleteCycle";
import { formatShortDate, planWeekOf } from "../lib/format";
import { planStats, totalWeeks } from "../lib/planGrid";

// «Mis ciclos» del atleta: una tarjeta por ciclo, con su semana en curso, los
// segmentos por semana y lo que le toca. Activo primero, terminados abajo.
// Diseño: docs/diseno/plan-del-atleta.

interface Row {
  cycle: TrainingCycle;
  sessions: TrainingSession[];
}

function isEnded(cycle: TrainingCycle, currentWeek: number, weeks: number): boolean {
  return cycle.status !== "active" || currentWeek > weeks;
}

function CycleCard({ row }: { row: Row }) {
  const { cycle, sessions } = row;
  const isMacro = cycle.cycleType === "macrocycle";
  const weeks = totalWeeks(cycle.startDate, cycle.endDate);
  const currentWeek = planWeekOf(cycle.startDate);
  const stats = planStats(sessions, currentWeek);
  const ended = isEnded(cycle, currentWeek, weeks);
  const due = dueNow(sessions, currentWeek);
  const week = weekCount(sessions, currentWeek);

  let pill = (
    <span className="pill pill-blue">
      Semana {currentWeek} de {weeks}
    </span>
  );
  let line: ReactNode = null;
  if (isMacro) {
    pill = <span className="pill">Macrociclo</span>;
  } else if (ended) {
    pill = <span className="pill pill-ok">Terminó</span>;
    line = `Completaste ${stats.completed} de ${stats.assigned} sesiones.`;
  } else if (stats.assigned === 0) {
    pill = <span className="pill">Sin sesiones</span>;
    line = "Tu coach aún no asigna rutinas a este ciclo.";
  } else if (currentWeek < 1) {
    pill = <span className="pill">Empieza el {formatShortDate(cycle.startDate)}</span>;
    line = `Tu coach asignó ${stats.assigned} ${stats.assigned === 1 ? "sesión" : "sesiones"}.`;
  } else if (due) {
    line = (
      <>
        Te toca <b>{due.name}</b>. Esta semana llevas {week.done} de {week.total}.
      </>
    );
  } else {
    line = "Terminaste las sesiones de esta semana.";
  }

  return (
    <Link to={`/cycles/${cycle.id}`} className="ac-card">
      <div className="ac-top">
        <h3>{cycle.name}</h3>
        {pill}
      </div>
      {!isMacro && stats.assigned > 0 && (
        <div className="ac-segs" role="img" aria-label={`${weeks} semanas`}>
          {Array.from({ length: weeks }, (_, i) => i + 1).map((n) => {
            const cls = weekIsComplete(sessions, n) ? "ac-done" : n === currentWeek && !ended ? "ac-cur" : undefined;
            return <i key={n} className={cls} />;
          })}
        </div>
      )}
      {line && <p>{line}</p>}
    </Link>
  );
}

export function AthleteCycleList({ cycles }: { cycles: TrainingCycle[] }) {
  const ids = cycles.map((c) => c.id).join(",");
  const query = useQuery({
    queryKey: ["athlete-cycle-list", ids],
    queryFn: async (): Promise<Row[]> =>
      Promise.all(
        cycles.map(async (cycle) => ({
          cycle,
          sessions: cycle.cycleType === "macrocycle" ? [] : await sessionsApi.listSessions(cycle.id),
        })),
      ),
  });

  if (query.isLoading) return <p>Cargando…</p>;
  if (query.isError || !query.data) return <div className="error-banner">No se pudo cargar la lista.</div>;

  const active: Row[] = [];
  const finished: Row[] = [];
  for (const row of query.data) {
    const weeks = totalWeeks(row.cycle.startDate, row.cycle.endDate);
    (isEnded(row.cycle, planWeekOf(row.cycle.startDate), weeks) ? finished : active).push(row);
  }

  // El que está en curso va primero; el que aún no empieza, después.
  active.sort((a, b) => Number(planWeekOf(a.cycle.startDate) < 1) - Number(planWeekOf(b.cycle.startDate) < 1));

  return (
    <div className="ac-list">
      {active.length > 0 && (
        <>
          <h2 className="ac-section">Activo</h2>
          <div className="ac-cards">
            {active.map((row) => (
              <CycleCard key={row.cycle.id} row={row} />
            ))}
          </div>
        </>
      )}
      {finished.length > 0 && (
        <>
          <h2 className="ac-section">Terminados</h2>
          <div className="ac-cards">
            {finished.map((row) => (
              <CycleCard key={row.cycle.id} row={row} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
