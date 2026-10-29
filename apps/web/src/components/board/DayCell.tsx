import type { ReactNode } from "react";
import type { BoardDay } from "../../lib/board";
import { dayOfMonth, weekdayShort } from "../../lib/weekCalendar";
import { PlusIcon } from "./icons";

interface DayCellProps {
  day: BoardDay;
  isToday: boolean;
  readOnly: boolean;
  // Estado del arrastre sobre este día: se puede soltar, o no.
  dropState: "ok" | "bad" | null;
  plusOpen: boolean;
  onPlus: (button: HTMLButtonElement) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
  children: ReactNode;
}

// Un día del calendario: número, «+» para sumar una sesión y las tarjetas.
export function DayCell({ day, isToday, readOnly, dropState, plusOpen, onPlus, onDragOver, onDragLeave, onDrop, children }: DayCellProps) {
  const has = day.sessions.length > 0;
  const canAdd = !readOnly && day.state === "ok";
  const label = `${weekdayShort(day.iso)} ${dayOfMonth(day.iso)}`;
  const classes = [
    "bd-dc",
    isToday && "bd-dc-today",
    day.state !== "ok" && "bd-dc-off",
    day.state === "out" && "bd-dc-out",
    has && "bd-dc-has",
    dropState === "ok" && "bd-dc-dropok",
    dropState === "bad" && "bd-dc-dropbad",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div
      className={classes}
      data-why={day.state}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      aria-label={`${label}${isToday ? ", hoy" : ""}${day.state === "past" ? ", día pasado" : day.state === "out" ? ", fuera del ciclo" : ""}`}
      role="group"
    >
      <div className="bd-top">
        <span className="bd-dn">
          <span className="bd-dn-w">{weekdayShort(day.iso)} </span>
          {dayOfMonth(day.iso)}
        </span>
        {canAdd && (
          <button
            type="button"
            className={`bd-plus${has ? " bd-plus-faint" : ""}`}
            aria-haspopup="dialog"
            aria-expanded={plusOpen}
            aria-label={`${has ? "Agregar otra sesión" : "Asignar rutina"} el ${label}`}
            onClick={(e) => onPlus(e.currentTarget)}
          >
            <PlusIcon />
          </button>
        )}
      </div>
      {has && <div className="bd-cards">{children}</div>}
    </div>
  );
}
