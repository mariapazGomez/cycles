import { useState } from "react";
import { Pearl } from "./events/Pearl";
import { useBoardEvents } from "../hooks/useBoardEvents";
import { INTENSITY_LABEL, groupByDay, longDay, monthCell, shortDate, timeLabel } from "../lib/eventCalendar";
import { kindFor } from "../lib/eventPearls";
import { clashDays, clashSentence } from "../lib/loadClash";
import { Link } from "react-router-dom";
import type { AthleteEventOccurrence, TrainingCycle } from "@cycles/shared";
import type { AthleteStatus } from "../lib/coachHome";
import { newCyclePath } from "../lib/library";
import type { AttentionItem } from "../services/trackingApi";
import { dayOfMonth, weekRangeLabel, weekdayShort } from "../lib/weekCalendar";
import { attentionBadge, BoardSession, sessionsByDay, weekDays, weekSummary } from "../lib/weekBoard";
import { AttentionList } from "./AttentionList";
import { CheckBadge } from "./CheckBadge";
import { Skeleton } from "./Skeleton";

export interface BoardRow {
  id: string;
  name: string;
  email: string;
  status: AthleteStatus;
  cycleName: string | null;
  // Ciclo activo del atleta (el de más arriba si vive dentro de un macrociclo).
  cycle: TrainingCycle | null;
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

// Franja de perlas de lo que el atleta agregó ese día (CYC-253): hasta 2; con 3 o más, una y «+N».
// Solo lectura, sin notas. El nombre accesible dice qué es y cuándo.
function EventStrip({ athlete, iso, events }: { athlete: string; iso: string; events: AthleteEventOccurrence[] }) {
  const { shown, extra } = monthCell({ iso, day: 0, weekday: 0, inMonth: true }, events);
  const label = `${athlete}, ${longDay(iso)}: ${events.map((e) => `${e.title}, ${timeLabel(e)}`).join("; ")}`;
  return (
    <span className="cb-ev" role="img" aria-label={label} title={label}>
      {shown.map((e) => (
        <Pearl key={`${e.seriesId}-${e.date}`} kind={kindFor(e)} />
      ))}
      {extra > 0 && <span className="ev-more">+{extra}</span>}
    </span>
  );
}

// Con más sesiones que esto en un día se ven las primeras y el resto se abre.
const MAX_TILES = 3;

const MESSAGE: Partial<Record<AthleteStatus, string>> = {
  no_plan: "Sin ciclo activo esta semana.",
  pending: "Invitación pendiente.",
};

// Tablero de la semana de todos tus atletas (docs/diseno/ciclo-en-calendario):
// una tarjeta por atleta, con sus sesiones en cada día. El motivo de atención
// va bajo el nombre y, al tocarlo, se abren los avisos con sus acciones.
export function CoachWeekBoard({ rows, monday, todayIso, onDismiss, onApplied }: CoachWeekBoardProps) {
  const [onlyAttention, setOnlyAttention] = useState(false);
  // Capa de actividades de los atletas (CYC-253): se recuerda en este navegador; encendida por defecto.
  const [layerOn, setLayerOn] = useState(() => {
    try {
      return window.localStorage.getItem("cycles.board.events") !== "off";
    } catch {
      return true;
    }
  });
  function toggleLayer(on: boolean) {
    setLayerOn(on);
    try {
      window.localStorage.setItem("cycles.board.events", on ? "on" : "off");
    } catch {
      // sin almacenamiento: la preferencia vale solo mientras esta pantalla esté abierta
    }
  }
  const board = useBoardEvents(
    rows.map((r) => ({ id: r.id, cycle: r.cycle, enabled: r.status !== "pending" })),
    monday,
    layerOn,
  );
  const [openClash, setOpenClash] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});
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
        <label className="ev-switch">
          <input type="checkbox" role="switch" checked={layerOn} onChange={(e) => toggleLayer(e.target.checked)} />
          <span>Actividades de los atletas</span>
        </label>
        {board.anyError && (
          <span className="ev-note" role="alert">
            No se pudieron cargar algunas actividades.{" "}
            <button type="button" className="tour-link" onClick={board.refetch}>
              Reintentar
            </button>
          </span>
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
        {days.map((iso, i) => (
          <span key={iso} className={`cb-head-day${iso === todayIso ? " cb-head-today" : ""}${i >= 5 ? " cb-head-weekend" : ""}`}>
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
          const layer = board.byAthlete.get(row.id);
          const eventsByDay = groupByDay(layer?.events ?? []);
          const flagged = clashDays(layer?.clashes ?? []);
          const clashOpen = Boolean(openClash[row.id]);
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
                    {layer && layer.clashes.length > 0 && <em className="cb-clash-tag">⚠ Choque de carga</em>}
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
                      className={`cb-day${iso === todayIso ? " cb-day-today" : ""}${i >= 5 ? " cb-day-weekend" : ""}${grouped[i].length === 0 && !eventsByDay[iso] ? " cb-day-empty" : ""}${flagged.has(iso) ? " cb-day-clash" : ""}`}
                      data-d={`${weekdayShort(iso).slice(0, 1)} ${dayOfMonth(iso)}`}
                    >
                      {(openDays[`${row.id}:${iso}`] ? grouped[i] : grouped[i].slice(0, MAX_TILES)).map((session) => (
                        <Tile key={session.id} session={session} dayName={`${weekdayShort(iso)} ${dayOfMonth(iso)}`} />
                      ))}
                      {grouped[i].length > MAX_TILES && (
                        <button
                          type="button"
                          className="cb-more"
                          aria-expanded={Boolean(openDays[`${row.id}:${iso}`])}
                          onClick={() => setOpenDays((prev) => ({ ...prev, [`${row.id}:${iso}`]: !prev[`${row.id}:${iso}`] }))}
                        >
                          {openDays[`${row.id}:${iso}`] ? "Ver menos" : `+${grouped[i].length - MAX_TILES} más`}
                        </button>
                      )}
                      {eventsByDay[iso] && <EventStrip athlete={row.name} iso={iso} events={eventsByDay[iso]} />}
                    </div>
                  ))
                ) : row.weekLoading ? (
                  days.map((iso, i) => (
                    <div key={iso} className={`cb-day${iso === todayIso ? " cb-day-today" : ""}${i >= 5 ? " cb-day-weekend" : ""}`} aria-hidden="true">
                      {i % 2 === 0 && i < 5 ? <Skeleton height={56} className="sk-tile" /> : null}
                    </div>
                  ))
                ) : (
                  <p className="cb-message">
                    {message ?? "No pudimos cargar la semana."}
                    {row.status === "no_plan" && (
                      <>
                        {" "}
                        <Link to={newCyclePath(row.id)}>Crear ciclo</Link>
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

              {layer && layer.clashes.length > 0 && (
                <div className="cb-clash" role="status">
                  <span aria-hidden="true">⚠</span>
                  <span>Choque de carga: {clashSentence(layer.clashes)}</span>
                  <button type="button" className="tour-link" aria-expanded={clashOpen} onClick={() => setOpenClash((p) => ({ ...p, [row.id]: !clashOpen }))}>
                    Ver detalle
                  </button>
                  {clashOpen && (
                    <div className="ev-clash-detail">
                      {layer.clashes.slice(0, 3).map((c) => (
                        <p key={`${c.sessionDate}-${c.event.seriesId}-${c.eventDate}`}>
                          <strong>{shortDate(c.sessionDate)}:</strong> {c.session.name}, {c.session.volume} series, entre las más altas del ciclo.
                          <br />
                          <strong>{shortDate(c.eventDate)}:</strong> {c.event.title}, intensidad {INTENSITY_LABEL[c.event.intensity ?? "high"]}
                          {c.event.startTime ? `, ${c.event.startTime}` : ""}.
                        </p>
                      ))}
                      <p>Considera mover la sesión o bajar el volumen. Es solo un aviso.</p>
                    </div>
                  )}
                </div>
              )}

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
