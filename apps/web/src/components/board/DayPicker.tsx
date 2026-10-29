import { useState } from "react";
import { dayOfMonth, weekdayName, shortDate } from "../../lib/weekCalendar";

interface DayPickerProps {
  label: string;
  confirmLabel: string;
  // Días válidos por semana (ya sin el día actual ni los pasados).
  options: { week: number; days: string[] }[];
  onPick: (dayIso: string) => void;
  onCancel: () => void;
}

// Elegir un día sin arrastrar: lista de los días que aceptan la sesión.
export function DayPicker({ label, confirmLabel, options, onPick, onCancel }: DayPickerProps) {
  const first = options[0]?.days[0] ?? "";
  const [day, setDay] = useState(first);
  if (options.length === 0) {
    return (
      <div className="bd-pop-body">
        <p className="bd-hint">Ya no quedan días disponibles en este ciclo. Agrega una semana para seguir planificando.</p>
        <button type="button" className="bd-btn" onClick={onCancel}>
          Cerrar
        </button>
      </div>
    );
  }
  return (
    <form
      className="bd-pop-body"
      onSubmit={(e) => {
        e.preventDefault();
        if (day) onPick(day);
      }}
    >
      <label className="bd-lbl" htmlFor="bd-day-select">
        {label}
      </label>
      <select id="bd-day-select" className="bd-inp" value={day} onChange={(e) => setDay(e.target.value)}>
        {options.map((group) => (
          <optgroup key={group.week} label={`Semana ${group.week}`}>
            {group.days.map((iso) => (
              <option key={iso} value={iso}>
                {weekdayName(iso)} {dayOfMonth(iso)} · {shortDate(iso)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <div className="bd-actions">
        <button type="submit" className="bd-btn bd-btn-p">
          {confirmLabel}
        </button>
        <button type="button" className="bd-btn" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

