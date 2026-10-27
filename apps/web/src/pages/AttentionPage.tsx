import { useState } from "react";
import { Link } from "react-router-dom";
import { CoachHero } from "../components/CoachHero";
import { CoachWeekBoard } from "../components/CoachWeekBoard";
import { CoachBoardSkeleton, Skeleton, SlowNotice } from "../components/Skeleton";
import { usePageBackground } from "../hooks/usePageBackground";
import { useCoachRoster } from "../hooks/useCoachRoster";
import { todaySummary } from "../lib/weekBoard";

// Inicio del coach: responde "¿a quién miro primero?" y "¿cómo va la semana?".
// Arriba, las sesiones de hoy y cuántos atletas necesitan atención; abajo, la
// semana de todos tus atletas, una tarjeta por atleta, con los que necesitan
// atención primero. Ver docs/diseno/ciclo-en-calendario y
// docs/prds/features/PRD-EjecucionYSeguimiento.md, §7.2.
export function AttentionPage() {
  const roster = useCoachRoster();
  const [applied, setApplied] = useState<string | null>(null);

  usePageBackground();

  const { rows, monday, todayIso, attentionGroups } = roster;
  const hasAthletes = rows.length > 0;
  const weeksReady = rows.every((r) => !r.weekLoading);
  const today = weeksReady ? todaySummary(rows.map((r) => r.week), todayIso) : null;

  return (
    <div className="hm-page">
      <div className="page-header">
        <h1 className="page-title">Inicio</h1>
        {hasAthletes && (
          <Link className="button-secondary hm-invite" to="/athletes">
            Invitar atleta
          </Link>
        )}
      </div>

      {roster.attentionError && <div className="error-banner">No pudimos cargar tus avisos. Revisa tu conexión e inténtalo de nuevo.</div>}

      {roster.loading ? (
        <>
          <div className="cy-strip cy-sk-strip" aria-busy="true" aria-label="Cargando tu resumen">
            <Skeleton width={150} height={24} />
            <Skeleton width={260} height={12} />
          </div>
          <CoachBoardSkeleton />
          <SlowNotice />
        </>
      ) : (
        <>
          {!roster.attentionError && <CoachHero attentionCount={attentionGroups.length} hasAthletes={hasAthletes} today={today} />}

          {applied && (
            <div className="success-banner" role="status">
              <strong>Ajuste aplicado.</strong> {applied}
            </div>
          )}

          {hasAthletes && (
            <CoachWeekBoard rows={rows} monday={monday} todayIso={todayIso} onDismiss={roster.dismiss} onApplied={setApplied} />
          )}
        </>
      )}
    </div>
  );
}
