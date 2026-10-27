import { useState } from "react";
import { Link } from "react-router-dom";
import type { AthleteStatus } from "../lib/coachHome";
import type { AttentionItem } from "../services/trackingApi";
import { dayOfMonth, weekRangeLabel, weekdayShort } from "../lib/weekCalendar";
import { attentionBadge, BoardSession, sessionsByDay, weekDays, weekSummary } from "../lib/weekBoard";
import { AttentionList } from "./AttentionList";
import { CheckBadge } from "./CheckBadge";
import { Skeleton } from "./Skeleton";

export interface BoardRow {
  id: string;
  name: string;
  status: AthleteStatus;
  cycleName: string | null;
  // null mientras no se sabe (cargando) o si el atleta no tiene ciclo.
  week: BoardSession[] | null;
  weekLoading: boolean;
  attention: AttentionItem[];
}

interface CoachWeekBoardProps {
  rows: BoardRow[];
  monday: string;
  todayIso: string;
  onDismiss: (item: AttentionItem) => void;
  onApplied: (message: string) => void;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function Glyph({ status }: { status: BoardSession["status"] }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="cb-glyph">
      {status === "completed" ? (
        <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      ) : status === "skipped" ? (
        <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      ) : (
        <circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
      )}
    </svg>
  );
}

function Tile({ session, dayName }: { session: BoardSession; dayName: string }) {
  const done = session.status === "completed";
  const skipped = session.status === "skipped";
  const label = done ? "completada" : skipped ? "omitida" : "pendiente";
  return (
    <Link
      to={`/sessions/${session.id}`}
      className={`cb-tile${done ? " cb-tile-done" : skipped ? " cb-tile-skip" : ""}`}
      aria-label={`${session.name}, ${dayName}, ${label}`}
      title={`${session.name}, ${label}`}
    >
      <span className="cb-tile-name">{session.name}</span>
      <span className="cb-tile-state">{done ? <CheckBadge /> : skipped ? "Omitida" : "Pendiente"}</span>
      {session.pain && <em>Dolor</em>}
      <Glyph status={session.status} />
    </Link>
  );
}

const MESSAGE: Partial<Record<AthleteStatus, string>> = {
  no_plan: "Sin ciclo activo esta semana.",
  pending: "Invitación pendiente.",
};

// Tablero de la semana de todos tus atletas (docs/diseno/ciclo-en-calendario):
// una tarjeta por atleta, con sus sesiones en cada día. El motivo de atención
// va bajo el nombre y, al tocarlo, se abren los avisos con sus acciones.
export function CoachWeekBoard({ rows, monday, todayIso, onDismiss, onApplied }: CoachWeekBoardProps) {
  const [onlyAttention, setOnlyAttention] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const days = weekDays(monday);
  const attentionCount = rows.filter((r) => r.attention.length > 0).length;
  const visible = onlyAttention ? rows.filter((r) => r.attention.length > 0) : rows;

  return (
    <section className="cb" aria-label="Esta semana">
      <div className="cb-bar">
        <h2 className="section-title">Esta semana</h2>
        <span className="pill pill-blue">{weekRangeLabel(monday)}</span>
        {attentionCount > 0 && (
          <button type="button" className="cb-chip" aria-pressed={onlyAttention} onClick={() => setOnlyAttention((v) => !v)}>
            Necesitan atención <em>{attentionCount}</em>
          </button>
        )}
        <span className="cb-spacer" />
        <span className="pc-legend" aria-hidden="true">
          <span>
            <CheckBadge small label="Hecha" /> Hecha
          </span>
          <span>
            <i className="pc-legend-swatch" /> Pendiente
          </span>
          <span>
            <i className="pc-legend-swatch pc-legend-skip" /> Omitida
          </span>
        </span>
      </div>

      <div className="cb-head" aria-hidden="true">
        <span />
        {days.map((iso) => (
          <span key={iso} className={iso === todayIso ? "cb-head-today" : undefined}>
            {weekdayShort(iso)} {dayOfMonth(iso)}
          </span>
        ))}
        <span>Semana</span>
      </div>

      <ul className="cb-list">
        {visible.map((row) => {
          const badge = attentionBadge(row.attention);
          const expanded = Boolean(open[row.id]);
          const summary = row.week ? weekSummary(row.week) : null;
          const grouped = row.week ? sessionsByDay(row.week, monday) : null;
          const message = MESSAGE[row.status];
          return (
            <li
              key={row.id}
              className={`cb-card${badge ? (badge.kind === "pain" ? " cb-card-pain" : " cb-card-warn") : ""}`}
            >
              <div className="cb-row">
                <div className="cb-who">
                  <span className="hm-avatar hm-avatar-sm" aria-hidden="true">
                    {initials(row.name)}
                  </span>
                  <span className="cb-who-text">
                    {row.status === "pending" ? <b>{row.name}</b> : <Link to={`/athletes/${row.id}`}>{row.name}</Link>}
                    {row.cycleName && <small>{row.cycleName}</small>}
                    {badge && (
                      <button
                        type="button"
                        className={`pill ${badge.kind === "pain" ? "pill-pain" : "pill-warn"} cb-badge`}
                        aria-expanded={expanded}
                        aria-controls={`cb-detail-${row.id}`}
                        onClick={() => setOpen((prev) => ({ ...prev, [row.id]: !expanded }))}
                      >
                        {badge.label}
                        {badge.extra > 0 ? ` y ${badge.extra} más` : ""}
                      </button>
                    )}
                  </span>
                </div>

                {grouped ? (
                  days.map((iso, i) => (
                    <div
                      key={iso}
                      className={`cb-day${iso === todayIso ? " cb-day-today" : ""}${grouped[i].length === 0 ? " cb-day-empty" : ""}`}
                      data-d={`${weekdayShort(iso).slice(0, 1)} ${dayOfMonth(iso)}`}
                    >
                      {grouped[i].map((session) => (
                        <Tile key={session.id} session={session} dayName={`${weekdayShort(iso)} ${dayOfMonth(iso)}`} />
                      ))}
                    </div>
                  ))
                ) : row.weekLoading ? (
                  days.map((iso, i) => (
                    <div key={iso} className="cb-day" aria-hidden="true">
                      {i % 2 === 0 && i < 5 ? <Skeleton height={56} className="sk-tile" /> : null}
                    </div>
                  ))
                ) : (
                  <p className="cb-message">
                    {message ?? "No pudimos cargar la semana."}
                    {row.status === "no_plan" && (
                      <>
                        {" "}
                        <Link to="/cycles">Crear ciclo</Link>
                      </>
                    )}
                  </p>
                )}

                <div className="cb-summary">
                  {summary && summary.of > 0 ? (
                    <>
                      <b>
                        {summary.done} de {summary.of}
                      </b>
                      <small>sesiones</small>
                    </>
                  ) : null}
                </div>
              </div>

              {badge && expanded && (
                <div id={`cb-detail-${row.id}`} className="cb-detail">
                  <AttentionList items={row.attention} onDismiss={onDismiss} onApplied={onApplied} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {visible.length === 0 && <p className="cb-none">Nadie necesita atención esta semana.</p>}
    </section>
  );
}
