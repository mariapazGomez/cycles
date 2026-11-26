import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { TrainingCycle } from "@cycles/shared";
import * as sessionsApi from "../services/sessionsApi";
import type { AthleteStatus } from "../lib/coachHome";
import { planWeekOf } from "../lib/format";
import { newCyclePath } from "../lib/library";
import { totalWeeks } from "../lib/planGrid";
import { attentionBadge, cycleCardData, sessionsByDay, weekDays, type BoardSession } from "../lib/weekBoard";
import { dayOfMonth, weekdayShort } from "../lib/weekCalendar";
import { CheckBadge } from "./CheckBadge";
import { Skeleton } from "./Skeleton";
import type { BoardRow } from "./CoachWeekBoard";

export interface Adherence {
  done: number;
  of: number;
}

interface AthleteCardProps {
  row: BoardRow;
  monday: string;
  todayIso: string;
  // Sesiones completadas de las asignadas en las últimas semanas; null si no se sabe.
  adherence: Adherence | null;
  adherenceLoading: boolean;
}

const STATUS_LABEL: Record<AthleteStatus, string> = {
  attention: "Con avisos",
  ok: "Al día",
  no_plan: "Sin ciclo",
  pending: "Invitación pendiente",
};

const STATUS_PILL: Record<AthleteStatus, string> = {
  attention: "pill pill-warn",
  ok: "pill pill-ok",
  no_plan: "pill",
  pending: "pill",
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function DayMark({ sessions }: { sessions: BoardSession[] }) {
  if (sessions.length === 0) return <span className="at-mark at-mark-none" aria-hidden="true" />;
  const first = sessions[0];
  if (first.status === "completed") return <CheckBadge small label="Hecha" />;
  if (first.status === "skipped") {
    return (
      <span className="at-mark at-mark-skip" role="img" aria-label="Omitida">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  return <span className="at-mark at-mark-pending" role="img" aria-label="Pendiente" />;
}

// Los siete días de la semana, con una marca por sesión: hecha, omitida o pendiente.
function WeekStrip({ week, monday, todayIso, loading }: { week: BoardSession[] | null; monday: string; todayIso: string; loading: boolean }) {
  const days = weekDays(monday);
  const grouped = week ? sessionsByDay(week, monday) : null;
  return (
    <div className="at-week" role="group" aria-label="Sesiones de esta semana">
      {days.map((iso, i) => (
        <div key={iso} className={`at-day${iso === todayIso ? " at-day-today" : ""}`} title={`${weekdayShort(iso)} ${dayOfMonth(iso)}`}>
          <span className="at-day-name" aria-hidden="true">
            {weekdayShort(iso).slice(0, 1)}
          </span>
          {grouped ? <DayMark sessions={grouped[i]} /> : loading ? <Skeleton width={18} height={18} round="circle" /> : <span className="at-mark at-mark-none" aria-hidden="true" />}
        </div>
      ))}
    </div>
  );
}

// Con dos o más ciclos a la vez, un bloque por ciclo: nombre, semana, su tira y sus completadas.
function CycleBlock({ cycle, monday, todayIso }: { cycle: TrainingCycle; monday: string; todayIso: string }) {
  const query = useQuery({ queryKey: ["cycles", cycle.id, "sessions"], queryFn: () => sessionsApi.listSessions(cycle.id), staleTime: 60_000 });
  const data = query.data ? cycleCardData(cycle.startDate, cycle.sessionsPerWeek ?? 0, query.data, monday) : null;
  return (
    <div className="at-block">
      <div className="at-cycle">
        <Link to={`/cycles/${cycle.id}`}>{cycle.name}</Link>
        <CycleWeek cycle={cycle} />
      </div>
      <WeekStrip week={data?.week ?? null} monday={monday} todayIso={todayIso} loading={query.isLoading} />
      <div className="at-adherence">
        {query.isError ? (
          <span>No se pudieron cargar sus sesiones.</span>
        ) : !data ? (
          <Skeleton height={8} />
        ) : data.of > 0 ? (
          <span>
            {data.done} de {data.of} {data.of === 1 ? "sesión completada" : "sesiones completadas"}
          </span>
        ) : (
          <span>Aún sin sesiones completadas.</span>
        )}
      </div>
    </div>
  );
}

function CycleWeek({ cycle }: { cycle: TrainingCycle }) {
  const week = planWeekOf(cycle.startDate);
  if (week < 1 || cycle.cycleType === "macrocycle") return null;
  const total = totalWeeks(cycle.startDate, cycle.endDate);
  return (
    <span>
      Semana {Math.min(week, total)} de {total}
    </span>
  );
}

// Una tarjeta por atleta (docs/diseno/ciclo-en-calendario): quién es, cómo va su
// ciclo y su semana, y a dónde ir desde aquí.
export function AthleteCard({ row, monday, todayIso, adherence, adherenceLoading }: AthleteCardProps) {
  const badge = attentionBadge(row.attention);
  const summaryPath = `/athletes/${row.id}`;
  const cycle = row.cycle;
  const several = row.status !== "pending" && row.liveCycles.length >= 2;
  // Con varios ciclos, el aviso dice de cuál es.
  const badgeCycle = several ? row.attention[0]?.cycle.name : undefined;
  const percent = adherence && adherence.of > 0 ? Math.round((adherence.done / adherence.of) * 100) : null;

  return (
    <li className={`at-card${badge ? (badge.kind === "pain" ? " at-card-pain" : " at-card-warn") : ""}`} data-tour="athlete-row" data-tour-id={row.id}>
      <div className="at-top">
        <span className="hm-avatar" aria-hidden="true">
          {initials(row.name)}
        </span>
        <div className="at-id">
          {row.status === "pending" ? <b>{row.name}</b> : <Link to={summaryPath}>{row.name}</Link>}
          <small>{row.email}</small>
        </div>
        <span className={STATUS_PILL[row.status]}>{STATUS_LABEL[row.status]}</span>
      </div>

      {(row.teams ?? []).length > 0 && (
        <ul className="at-teams" aria-label="Equipos">
          {(row.teams ?? []).map((t) => (
            <li key={t.id}>
              <Link className="tm-tag" to={`/equipos/${t.id}`}>
                {t.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {badge && (
        <Link className={`pill ${badge.kind === "pain" ? "pill-pain" : "pill-warn"} at-badge`} to={summaryPath}>
          {badge.label}
          {badgeCycle ? ` en ${badgeCycle}` : ""}
          {badge.extra > 0 ? ` y ${badge.extra} más` : ""}
        </Link>
      )}

      {row.status === "pending" && (
        <p className="at-note">Le enviamos un correo para activar su cuenta. El enlace vence a los 7 días.</p>
      )}

      {row.status === "no_plan" && <p className="at-note">Todavía no tiene un ciclo activo.</p>}

      {several && row.liveCycles.map((c) => <CycleBlock key={c.id} cycle={c} monday={monday} todayIso={todayIso} />)}

      {!several && cycle && row.status !== "pending" && (
        <>
          <div className="at-cycle">
            <Link to={`/cycles/${cycle.id}`}>{cycle.name}</Link>
            <CycleWeek cycle={cycle} />
          </div>

          <WeekStrip week={row.week} monday={monday} todayIso={todayIso} loading={row.weekLoading} />

          <div className="at-adherence">
            {adherenceLoading ? (
              <Skeleton height={8} />
            ) : adherence && adherence.of > 0 ? (
              <>
                <div className="at-bar" role="img" aria-label={`${adherence.done} de ${adherence.of} sesiones completadas`}>
                  <i style={{ width: `${percent}%` }} />
                </div>
                <span>
                  {adherence.done} de {adherence.of} sesiones completadas
                </span>
              </>
            ) : (
              <span>Aún sin sesiones completadas.</span>
            )}
          </div>
        </>
      )}

      <div className="at-actions">
        {row.status !== "pending" && (
          <Link className="button-secondary" to={summaryPath}>
            Ver resumen
          </Link>
        )}
        {cycle && row.status !== "pending" && (
          <Link className="button-ghost" to={several ? summaryPath : `/cycles/${cycle.id}`}>
            {several ? "Ver ciclos" : "Ver ciclo"}
          </Link>
        )}
        {row.status === "no_plan" && (
          <Link className="button-primary" to={newCyclePath(row.id)}>
            Crear ciclo
          </Link>
        )}
      </div>
    </li>
  );
}

export function AthleteCardSkeleton() {
  return (
    <li className="at-card at-card-sk" aria-hidden="true">
      <div className="at-top">
        <Skeleton width={40} height={40} round="circle" />
        <div className="at-id">
          <Skeleton width="60%" height={14} />
          <Skeleton width="80%" height={11} />
        </div>
      </div>
      <Skeleton width="45%" height={14} />
      <Skeleton height={36} className="sk-tile" />
      <Skeleton height={8} />
    </li>
  );
}
