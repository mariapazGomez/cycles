import { useEffect, useRef, useState } from "react";
import { addDays, monthGrid, monthOf, monthTitle, shiftMonth, type CalendarDay } from "../../lib/eventCalendar";
import { BEFORE_TODAY_REASON, fullDayLabel, rangeSummary, type Range } from "../../lib/cycleRange";

const LETTERS = ["L", "M", "M", "J", "V", "S", "D"];
const monthIndex = (iso: string) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1;

// Dos meses a la vista para elegir las fechas de un ciclo (CYC-314). Los días anteriores a hoy salen
// apagados y la flecha de mes anterior no baja del mes actual (o del mes del inicio que se conserva).
// Se recorre con las flechas del teclado y cada día se anuncia con su fecha completa.
export function CycleRangePicker({
  value,
  onPick,
  today,
  keptStart = null,
  marked,
  markedLabel,
  busy,
  summary,
}: {
  value: Range;
  onPick: (iso: string) => void;
  today: string;
  // Inicio de un ciclo ya empezado: se ve marcado y se puede volver a él.
  keptStart?: string | null;
  // Días con otro ciclo: informan, no bloquean.
  marked?: Set<string>;
  markedLabel?: string;
  // Días ocupados por otro ciclo del equipo: se ven en naranja (cruzarlos da error).
  busy?: Set<string>;
  summary?: string;
}) {
  const floor = keptStart && keptStart < today ? keptStart : today;
  const [anchor, setAnchor] = useState(value.start ?? today);
  const [focusDay, setFocusDay] = useState(value.start ?? today);
  const gridRef = useRef<HTMLDivElement>(null);
  const wantsFocus = useRef(false);

  const first = monthOf(anchor);
  const second = shiftMonth(first.year, first.month, 1);
  const canGoBack = monthIndex(anchor) > monthIndex(floor);
  const visible = (iso: string) => {
    const i = monthIndex(iso);
    return i >= monthIndex(anchor) && i <= monthIndex(anchor) + 1;
  };

  useEffect(() => {
    if (!wantsFocus.current) return;
    wantsFocus.current = false;
    gridRef.current?.querySelector<HTMLElement>(`[data-day="${focusDay}"]`)?.focus();
  }, [focusDay, anchor]);

  function move(delta: number) {
    const next = shiftMonth(first.year, first.month, delta);
    const iso = `${next.year}-${String(next.month).padStart(2, "0")}-01`;
    setAnchor(iso);
    setFocusDay(iso < floor ? floor : iso);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = addDays(focusDay, step);
    if (next < floor) return;
    if (!visible(next)) setAnchor(next);
    wantsFocus.current = true;
    setFocusDay(next);
  }

  const tabDay = visible(focusDay) ? focusDay : `${anchor.slice(0, 7)}-01` < floor ? floor : `${anchor.slice(0, 7)}-01`;

  function cell(day: CalendarDay) {
    if (!day.inMonth) return <td key={day.iso} />;
    const iso = day.iso;
    const isStart = iso === value.start;
    const isEnd = iso === value.end;
    const inside = value.start && value.end && iso > value.start && iso < value.end;
    const disabled = iso < today && iso !== keptStart;
    const other = marked?.has(iso);
    const cls = ["cy-day", isStart || isEnd ? "cy-day-edge" : inside ? "cy-day-in" : "", iso === today ? "cy-day-today" : "", busy?.has(iso) ? "cy-day-busy" : "", disabled ? "cy-day-off" : ""].filter(Boolean).join(" ");
    return (
      <td key={iso}>
        <button
          type="button"
          data-day={iso}
          className={cls}
          tabIndex={iso === tabDay ? 0 : -1}
          aria-disabled={disabled || undefined}
          aria-pressed={isStart || isEnd || Boolean(inside)}
          aria-label={`${fullDayLabel(iso)}${iso === today ? ", hoy" : ""}${isStart ? ", primer día" : isEnd ? ", último día" : inside ? ", dentro del ciclo" : ""}${disabled ? `. ${BEFORE_TODAY_REASON}` : ""}${other && markedLabel ? `, ${markedLabel}` : ""}${busy?.has(iso) ? ", con otro ciclo del equipo" : ""}`}
          onClick={() => {
            setFocusDay(iso);
            if (!disabled) onPick(iso);
          }}
        >
          {day.day}
          {other && <i className="cy-dot" aria-hidden="true" />}
        </button>
      </td>
    );
  }

  const months = [first, second];
  return (
    <div className="cy-picker">
      <div className="cy-cal" ref={gridRef} onKeyDown={onKeyDown}>
        {months.map((m, index) => (
          <div key={`${m.year}-${m.month}`} className={index === 1 ? "cy-month cy-month-2" : "cy-month"}>
            <div className="cy-mhead">
              {index === 0 ? (
                <button type="button" className="cy-nav" aria-label="Mes anterior" disabled={!canGoBack} onClick={() => move(-1)}>
                  ‹
                </button>
              ) : (
                <span className="cy-nav" />
              )}
              <b aria-live="polite">{monthTitle(m.year, m.month).replace(/ de /, " ")}</b>
              <button type="button" className={index === 1 ? "cy-nav" : "cy-nav cy-nav-narrow"} aria-label="Mes siguiente" onClick={() => move(1)}>
                ›
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  {LETTERS.map((l, i) => (
                    <th key={i} scope="col" aria-hidden="true">
                      {l}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthGrid(m.year, m.month).map((row) => (
                  <tr key={row[0].iso}>{row.map(cell)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      <p className="cy-summary" role="status">
        {summary ?? rangeSummary(value, today)}
      </p>
    </div>
  );
}
