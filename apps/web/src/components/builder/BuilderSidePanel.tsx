import type { ReactNode } from "react";
import { formatInteger } from "../../lib/format";
import type { RoutineStats } from "../../lib/routineStats";

// Panel fijo del constructor: nombre, resumen de la carga y acciones.
export function BuilderSidePanel({
  name,
  onName,
  blockCount,
  stats,
  hasLoose,
  saving,
  confirmingLeave,
  onSave,
  onGroup,
  onCancel,
  onStay,
  onLeave,
  nameLabel = "Nombre de la rutina",
  saveLabel = "Guardar rutina",
  footNote = "Editar la rutina no cambia las sesiones que ya tienes asignadas. Volumen = series × reps × carga; duración = 40 s de trabajo por serie más el descanso.",
  fields,
  extra,
  tour = true,
  locked = false,
}: {
  name: string;
  onName: (value: string) => void;
  blockCount: number;
  stats: RoutineStats;
  hasLoose: boolean;
  saving: boolean;
  confirmingLeave: boolean;
  onSave: () => void;
  onGroup: () => void;
  onCancel: () => void;
  onStay: () => void;
  onLeave: () => void;
  nameLabel?: string;
  saveLabel?: string;
  footNote?: string;
  // Campos extra bajo el nombre (en la sesión: fecha y estado).
  fields?: ReactNode;
  // Acciones extra al final (en la sesión: borrar).
  extra?: ReactNode;
  // Anclas de la guía de la coach (solo en la rutina).
  tour?: boolean;
  locked?: boolean;
}) {
  return (
    <aside className="bld-side" aria-label="Resumen">
      <div>
        <label className="bld-lbl" htmlFor="bd-r-name">
          {nameLabel}
        </label>
        <input id="bd-r-name" data-autofocus data-tour={tour ? "drawer-name" : undefined} className="bld-name" type="text" value={name} disabled={locked} onChange={(e) => onName(e.target.value)} />
        {fields}
      </div>
      <div className="bld-kpis" aria-live="polite">
        <div>
          <span>Bloques</span>
          <b>{formatInteger(blockCount)}</b>
        </div>
        <div>
          <span>Series</span>
          <b>{formatInteger(stats.sets)}</b>
        </div>
        <div>
          <span>Duración</span>
          <b>{stats.sets > 0 ? `~${formatInteger(stats.durationMinutes)} min` : "—"}</b>
        </div>
        <div>
          <span>Volumen</span>
          <b>{formatInteger(stats.volumeKg)} kg</b>
        </div>
      </div>
      <button type="button" className="bld-btn bld-primary" data-tour={tour ? "drawer-save" : undefined} disabled={saving || locked} onClick={onSave}>
        {saving ? "Guardando…" : saveLabel}
      </button>
      {hasLoose && !locked && (
        <button type="button" className="bld-btn" onClick={onGroup}>
          Agrupar en bloques
        </button>
      )}
      {confirmingLeave ? (
        <div className="bld-leave" role="alert">
          <p>Tienes cambios sin guardar.</p>
          <button type="button" className="bld-btn" onClick={onStay}>
            Seguir editando
          </button>
          <button type="button" className="bld-btn bld-danger" onClick={onLeave}>
            Salir sin guardar
          </button>
        </div>
      ) : (
        <button type="button" className="bld-btn" onClick={onCancel}>
          Cancelar
        </button>
      )}
      {extra}
      <p className="bld-foot">{footNote}</p>
    </aside>
  );
}
