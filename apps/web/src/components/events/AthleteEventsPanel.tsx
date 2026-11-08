import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import type { AthleteEventOccurrence, TrainingCycle } from "@cycles/shared";
import * as sessionsApi from "../../services/sessionsApi";
import * as trackingApi from "../../services/trackingApi";
import { useAthleteEvents } from "../../hooks/useAthleteEvents";
import { toLocalDay } from "../../lib/calendar";
import {
  INTENSITY_LABEL, WEEKDAY_LETTER, WEEKDAY_SHORT, calendarWeek, compareEvents, groupByDay, longDay,
  monthCell, monthGrid, monthOf, monthRange, monthTitle, seriesIn, seriesLabel, shiftMonth, shiftWeek, shortDate, timeLabel,
  type CalendarDay,
} from "../../lib/eventCalendar";
import { PEARL_KINDS, kindFor } from "../../lib/eventPearls";
import { clashDays, clashSentence, isDemanding, loadClashes, type CoachSession } from "../../lib/loadClash";
import { coachSessionsOf, cyclesOverlapping } from "../../lib/coachSessions";
import { Pearl } from "./Pearl";
import { Skeleton } from "../Skeleton";

// Calendario de actividades del atleta en su perfil, para el coach (CYC-253, diseño
// docs/diseno/eventos-paralelos/coach-calendarios.html): Semana | Mes con las mismas perlas que la
// app, detalle del día a la derecha, «Fuera del plan» y aviso de choque de carga. Solo lectura.

type Mode = "week" | "month";

const COACH_KIND = PEARL_KINDS.coachStrength;

export function AthleteEventsPanel({ athleteId, athleteName, cycles }: { athleteId: string; athleteName: string; cycles: TrainingCycle[] }) {
  const today = toLocalDay(new Date());
  const first = athleteName.split(/\s+/)[0] || "el atleta";
  const [mode, setMode] = useState<Mode>("month");
  const [anchor, setAnchor] = useState(today);
  const [layerOn, setLayerOn] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { year, month } = monthOf(anchor);
  const week = useMemo(() => calendarWeek(anchor), [anchor]);
  const grid = useMemo(() => monthGrid(year, month), [year, month]);
  const range = mode === "month" ? monthRange(year, month) : { from: week[0].iso, to: week[6].iso };

  const eventsQuery = useAthleteEvents(athleteId, range.from, range.to, layerOn);
  const byDay = useMemo(() => groupByDay(layerOn ? eventsQuery.events : []), [eventsQuery.events, layerOn]);

  // Sesiones del coach de los ciclos que se cruzan con el rango (día elegido por el atleta y volumen).
  const near = useMemo(() => cyclesOverlapping(cycles, range.from, range.to), [cycles, range.from, range.to]);
  const sessionQueries = useQueries({ queries: near.map((c) => ({ queryKey: ["cycles", c.id, "sessions"], queryFn: () => sessionsApi.listSessions(c.id) })) });
  const progressQueries = useQueries({ queries: near.map((c) => ({ queryKey: ["cycles", c.id, "progress"], queryFn: () => trackingApi.getCycleProgress(c.id) })) });
  const coachSessions = useMemo<CoachSession[]>(
    () => near.flatMap((_, i) => coachSessionsOf(sessionQueries[i]?.data ?? [], progressQueries[i]?.data)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [near, sessionQueries.map((q) => q.dataUpdatedAt).join(), progressQueries.map((q) => q.dataUpdatedAt).join()],
  );
  const sessionsByDay = useMemo(() => {
    const map: Record<string, CoachSession[]> = {};
    for (const s of coachSessions) (map[s.date] ??= []).push(s);
    return map;
  }, [coachSessions]);

  const clashes = useMemo(() => (layerOn ? loadClashes(coachSessions, eventsQuery.events) : []), [coachSessions, eventsQuery.events, layerOn]);
  const flagged = useMemo(() => clashDays(clashes), [clashes]);
  const [showClash, setShowClash] = useState(false);

  function move(delta: number) {
    setSelected(null);
    if (mode === "month") {
      const next = shiftMonth(year, month, delta);
      setAnchor(`${next.year}-${String(next.month).padStart(2, "0")}-01`);
    } else {
      setAnchor(shiftWeek(anchor, delta));
    }
  }

  const title = mode === "month" ? monthTitle(year, month) : `${shortDate(week[0].iso)} – ${shortDate(week[6].iso)}`;
  const detailDay = selected ?? (mode === "week" ? today : null);

  function cell(day: CalendarDay) {
    const events = byDay[day.iso] ?? [];
    const { shown, extra } = monthCell(day, events);
    const sessions = sessionsByDay[day.iso] ?? [];
    const isSel = selected === day.iso;
    return (
      <button
        key={day.iso}
        type="button"
        className={`ev-cell${day.inMonth ? "" : " ev-cell-out"}${day.iso === today ? " ev-cell-today" : ""}${isSel ? " ev-cell-sel" : ""}${flagged.has(day.iso) ? " ev-cell-clash" : ""}`}
        aria-pressed={isSel}
        aria-label={`${longDay(day.iso)}${events.length ? `, ${events.length} ${events.length === 1 ? "actividad" : "actividades"}` : ""}${sessions.length ? `, ${sessions.length} ${sessions.length === 1 ? "sesión" : "sesiones"} del coach` : ""}${flagged.has(day.iso) ? ", choque de carga" : ""}`}
        onClick={() => {
          setSelected(day.iso);
          setDetailOpen(true);
        }}
      >
        <span className="ev-num">{day.day}</span>
        <span className="ev-pearls">
          {sessions.slice(0, 1).map((s) => (
            <Pearl key={s.id} kind={COACH_KIND} />
          ))}
          {shown.map((e) => (
            <Pearl key={`${e.seriesId}-${e.date}`} kind={kindFor(e)} />
          ))}
          {extra > 0 && <span className="ev-more">+{extra}</span>}
        </span>
      </button>
    );
  }

  const weekDay = (day: CalendarDay) => {
    const events = byDay[day.iso] ?? [];
    const sessions = sessionsByDay[day.iso] ?? [];
    const { shown, extra } = monthCell(day, events);
    return (
      <button
        key={day.iso}
        type="button"
        className={`ev-wday${day.iso === today ? " ev-cell-today" : ""}${selected === day.iso ? " ev-cell-sel" : ""}${flagged.has(day.iso) ? " ev-cell-clash" : ""}`}
        aria-pressed={selected === day.iso}
        onClick={() => {
          setSelected(day.iso);
          setDetailOpen(true);
        }}
      >
        <span className="ev-wname">{WEEKDAY_SHORT[day.weekday]} {day.day}</span>
        <span className="ev-wsessions">
          {sessions.map((s) => (
            <span key={s.id} className="ev-wsession">
              <Pearl kind={COACH_KIND} size={17} />
              <span>{s.name}</span>
            </span>
          ))}
        </span>
        <span className="ev-wlayer">
          {shown.map((e) => (
            <Pearl key={`${e.seriesId}-${e.date}`} kind={kindFor(e)} />
          ))}
          {extra > 0 && <span className="ev-more">+{extra}</span>}
        </span>
      </button>
    );
  };

  const dayEvents: AthleteEventOccurrence[] = detailDay ? [...(byDay[detailDay] ?? [])].sort(compareEvents) : [];
  const dayClashes = detailDay ? clashes.filter((c) => c.eventDate === detailDay || c.sessionDate === detailDay) : [];
  const series = seriesIn(eventsQuery.events);
  const loading = layerOn && eventsQuery.isLoading;

  return (
    <section className="ev-panel" aria-label={`Calendario de actividades de ${first}`}>
      <div className="ev-toolbar">
        <div className="ev-seg" role="group" aria-label="Vista del calendario">
          {(["week", "month"] as const).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => { setMode(m); setSelected(null); setDetailOpen(false); }}>
              {m === "week" ? "Semana" : "Mes"}
            </button>
          ))}
        </div>
        <strong className="ev-title">{title}</strong>
        <div className="ev-arrows">
          <button type="button" aria-label={mode === "month" ? "Mes anterior" : "Semana anterior"} onClick={() => move(-1)}>‹</button>
          <button type="button" aria-label={mode === "month" ? "Mes siguiente" : "Semana siguiente"} onClick={() => move(1)}>›</button>
        </div>
        <button type="button" className="cb-chip" onClick={() => { setAnchor(today); setSelected(null); setDetailOpen(false); }}>Hoy</button>
        <label className="ev-switch">
          <input type="checkbox" role="switch" checked={layerOn} onChange={(e) => setLayerOn(e.target.checked)} />
          <span>Actividades de {first}</span>
        </label>
        <ul className="ev-legend" aria-label="Leyenda">
          <li><Pearl kind={COACH_KIND} size={14} /> Sesión del coach</li>
          <li><Pearl kind={PEARL_KINDS.volleyball} size={14} /> Deporte</li>
          <li><Pearl kind={PEARL_KINDS.yoga} size={14} /> Descanso o yoga</li>
          <li><Pearl kind={PEARL_KINDS.match} size={14} /> Partido</li>
        </ul>
      </div>

      {!layerOn && <p className="ev-note">La capa de actividades está apagada. Enciéndela para ver lo que {first} agregó.</p>}
      {layerOn && eventsQuery.isError && (
        <div className="error-banner" role="alert">
          No se pudieron cargar las actividades.{" "}
          <button type="button" className="tour-link" onClick={eventsQuery.refetch}>Reintentar</button>
        </div>
      )}

      <div className={`ev-layout${detailOpen && detailDay ? " ev-with-detail" : ""}`}>
        <div className="ev-board">
          {loading ? (
            <Skeleton height={mode === "month" ? 320 : 120} />
          ) : mode === "month" ? (
            <div className="ev-month" role="group" aria-label={monthTitle(year, month)}>
              {WEEKDAY_LETTER.map((l) => <span key={l} className="ev-head">{l}</span>)}
              {grid.flat().map(cell)}
            </div>
          ) : (
            <div className="ev-week">{week.map(weekDay)}</div>
          )}
          {layerOn && !loading && !eventsQuery.isError && eventsQuery.events.length === 0 && (
            <p className="ev-note">Sin actividades en este periodo. Cuando {first} agregue actividades en su app, las verás aquí.</p>
          )}
          {clashes.length > 0 && (
            <div className="ev-clash" role="status">
              <span aria-hidden="true">⚠</span>
              <span>Choque de carga: {clashSentence(clashes)}</span>
              <button type="button" className="tour-link" aria-expanded={showClash} onClick={() => setShowClash((v) => !v)}>Ver detalle</button>
              {showClash && (
                <div className="ev-clash-detail">
                  {clashes.slice(0, 3).map((c) => (
                    <p key={`${c.sessionDate}-${c.event.seriesId}-${c.eventDate}`}>
                      <strong>{shortDate(c.sessionDate)}:</strong> {c.session.name}, {c.session.volume} series, entre las más altas del ciclo.
                      <br />
                      <strong>{shortDate(c.eventDate)}:</strong> {c.event.title}, {isDemanding(c.event) && c.event.type === "match" ? "partido" : "actividad"} de intensidad {INTENSITY_LABEL[c.event.intensity ?? "high"]}{c.event.startTime ? `, ${c.event.startTime}` : ""}.
                    </p>
                  ))}
                  <p>Considera mover la sesión o bajar el volumen. Es solo un aviso.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {detailOpen && detailDay && (
          <aside className="ev-detail" aria-label={`Detalle del ${longDay(detailDay)}`}>
            <div className="ev-detail-head">
              <strong>{longDay(detailDay).replace(/^./, (c) => c.toUpperCase())}</strong>
              <button type="button" className="tour-link" onClick={() => setDetailOpen(false)}>Cerrar</button>
            </div>
            {(sessionsByDay[detailDay] ?? []).map((s) => (
              <p key={s.id} className="ev-row"><Pearl kind={COACH_KIND} size={22} /><span><strong>{s.name}</strong><br />Sesión del coach · {s.volume} series</span></p>
            ))}
            {dayEvents.map((e) => (
              <p key={`${e.seriesId}-${e.date}`} className="ev-row">
                <Pearl kind={kindFor(e)} size={22} />
                <span>
                  <strong>{e.title}</strong>{e.repeat ? " (se repite)" : ""}
                  <br />
                  {timeLabel(e)}{e.intensity ? `. Intensidad ${INTENSITY_LABEL[e.intensity]}` : ""}
                </span>
              </p>
            ))}
            {dayEvents.length === 0 && (sessionsByDay[detailDay] ?? []).length === 0 && <p className="ev-note">Nada este día.</p>}
            {dayClashes.length > 0 && <p className="ev-clash-mini">⚠ Choque de carga: {clashSentence(dayClashes)}</p>}
            {dayEvents.length > 0 && <p className="ev-readonly">Lo agregó {first}. Solo lectura.</p>}
          </aside>
        )}
      </div>

      {layerOn && series.length > 0 && (
        <div className="ev-out">
          <h2 className="section-title">Fuera del plan</h2>
          <ul>
            {series.map((e) => (
              <li key={e.seriesId}>
                <Pearl kind={kindFor(e)} size={28} />
                <span>
                  <strong>{e.title}</strong>
                  <br />
                  <small>{seriesLabel(e)}</small>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}


