import { CSSProperties, useEffect, useState } from "react";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  round?: "block" | "circle";
  className?: string;
}

// Bloque gris que pulsa mientras llegan los datos. Decorativo: el contenedor
// que lo usa marca aria-busy.
export function Skeleton({ width = "100%", height = 16, round = "block", className = "" }: SkeletonProps) {
  const style: CSSProperties = { width, height };
  return <i className={`sk${round === "circle" ? " sk-circle" : ""} ${className}`.trim()} style={style} aria-hidden="true" />;
}

// Si la espera pasa de unos segundos, casi siempre es la API despertando
// (Render gratis la duerme tras 15 minutos sin tráfico).
export function SlowNotice({ after = 4000 }: { after?: number }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setSlow(true), after);
    return () => window.clearTimeout(id);
  }, [after]);
  if (!slow) return null;
  return (
    <p className="loading-hint" role="status">
      Estamos despertando el servidor. La primera vez del día puede tardar hasta un minuto.
    </p>
  );
}

// Calendario del ciclo mientras carga: franjas de semana con casillas.
export function PlanCalendarSkeleton({ weeks = 4 }: { weeks?: number }) {
  return (
    <div className="pc-skeleton" aria-busy="true" aria-label="Cargando el calendario">
      {Array.from({ length: weeks }, (_, w) => (
        <div key={w} className="pc-week pc-sk-week">
          <div className="pc-sk-label">
            <Skeleton width="70%" height={14} />
            <Skeleton width="50%" height={11} />
          </div>
          {Array.from({ length: 7 }, (_, d) => (
            <div key={d} className="pc-sk-cell">
              {d % 2 === 0 && d < 5 ? <Skeleton height={80} className="sk-tile" /> : null}
            </div>
          ))}
          <div className="pc-sk-label">
            <Skeleton width="50%" height={14} />
            <Skeleton width="70%" height={11} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Inicio del coach mientras carga: una tarjeta por atleta.
export function CoachBoardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="cb-list" aria-busy="true" aria-label="Cargando a tus atletas">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="cb-row cb-sk-row">
          <div className="cb-sk-who">
            <Skeleton width={32} height={32} round="circle" />
            <div className="cb-sk-label">
              <Skeleton width="70%" height={14} />
              <Skeleton width="45%" height={11} />
            </div>
          </div>
          {Array.from({ length: 7 }, (_, d) => (
            <div key={d} className="cb-sk-cell">
              {(d + r) % 3 === 0 ? null : <Skeleton height={56} className="sk-tile" />}
            </div>
          ))}
          <div className="cb-sk-sum">
            <Skeleton width="40%" height={14} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Detalle de un ciclo mientras carga: cabecera, franja y calendario.
export function CyclePageSkeleton() {
  return (
    <div className="pl-page" aria-busy="true" aria-label="Cargando el ciclo">
      <div className="cy-sk-head">
        <Skeleton width={220} height={32} />
        <Skeleton width={150} height={24} round="circle" />
      </div>
      <div className="cy-strip cy-sk-strip">
        <Skeleton width={150} height={24} />
        <Skeleton width={260} height={12} />
      </div>
      <PlanCalendarSkeleton />
      <SlowNotice />
    </div>
  );
}
