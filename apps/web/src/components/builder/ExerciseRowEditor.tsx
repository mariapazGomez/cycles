import { useState } from "react";
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import { NOTE_MAX_LENGTH } from "../ExerciseNote";
import { isRowComplete } from "../../lib/routineStats";
import type { DraftBlock } from "../../lib/blocksDraft";
import type { Row } from "../../lib/routineDraft";
import { RowMenu, type MenuItem } from "./RowMenu";

// Un ejercicio del constructor: series, reps, carga, descanso y RIR se editan directo en
// la fila; la nota va bajo el nombre (se edita desde el menú ⋯).
export function ExerciseRowEditor({
  row,
  blocks,
  attempted,
  canMoveUp,
  canMoveDown,
  onChange,
  onMoveUp,
  onMoveDown,
  onMoveToBlock,
  onDuplicate,
  onRemove,
  handleProps,
}: {
  row: Row;
  blocks: DraftBlock[];
  attempted: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChange: (patch: Partial<Row>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveToBlock: (blockKey: string | null) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  // Asa de arrastre (solo con arrastre activo).
  handleProps?: DraggableProvidedDragHandleProps | null;
}) {
  const [editingNote, setEditingNote] = useState(false);
  const missing = attempted && !isRowComplete(row);
  const logged = (row.loggedCount ?? 0) > 0;
  const bad = (value: string) => (missing && (value.trim() === "" || !/^[1-9]\d*$/.test(value.trim())) ? " bld-bad" : "");

  const targets: MenuItem[] = [
    ...blocks.filter((b) => b.key !== row.blockId).map((b) => ({ label: `Mover a «${b.name}»`, onClick: () => onMoveToBlock(b.key) })),
    ...(row.blockId ? [{ label: "Sacar del bloque", onClick: () => onMoveToBlock(null) }] : []),
  ];
  const items: MenuItem[] = [
    { label: "Subir", onClick: onMoveUp, disabled: !canMoveUp },
    { label: "Bajar", onClick: onMoveDown, disabled: !canMoveDown },
    ...targets,
    { label: row.note ? "Editar nota" : "Agregar nota", onClick: () => setEditingNote(true), divider: true },
    { label: "Duplicar", onClick: onDuplicate },
    { label: logged ? "Quitar (ya tiene series registradas)" : "Quitar", onClick: onRemove, danger: true, disabled: logged },
  ];

  return (
    <div className="bld-ex" data-tour="drawer-row">
      <span className="bld-grip" {...(handleProps ?? {})} aria-label={`Arrastrar ${row.name}`}>
        ⠿
      </span>
      <div className="bld-ex-name">
        <b>{row.name}</b>
        {row.result && <span className="bld-result">{row.result}</span>}
        {row.note && !editingNote && (
          <button type="button" className="bld-note" onClick={() => setEditingNote(true)} aria-label={`Editar la nota de ${row.name}`}>
            {row.note}
          </button>
        )}
      </div>
      <label className="bld-cell">
        <span>Ser.</span>
        <input className={`bld-f${bad(row.sets)}`} inputMode="numeric" aria-label={`Series de ${row.name}`} value={row.sets} onChange={(e) => onChange({ sets: e.target.value })} />
      </label>
      <label className="bld-cell">
        <span>Reps</span>
        <input id={`bld-reps-${row.key}`} className={`bld-f${bad(row.reps)}`} inputMode="numeric" aria-label={`Repeticiones de ${row.name}`} value={row.reps} onChange={(e) => onChange({ reps: e.target.value })} />
      </label>
      <label className="bld-cell">
        <span>Carga</span>
        <input className="bld-f" inputMode="decimal" placeholder="kg" aria-label={`Carga en kg de ${row.name}`} value={row.weight} onChange={(e) => onChange({ weight: e.target.value })} />
      </label>
      <label className="bld-cell">
        <span>Desc.</span>
        <input className="bld-f" inputMode="numeric" placeholder="s" aria-label={`Descanso en segundos de ${row.name}`} value={row.restSeconds} onChange={(e) => onChange({ restSeconds: e.target.value })} />
      </label>
      <label className="bld-cell">
        <span>RIR</span>
        <select className="bld-f" aria-label={`Reps en reserva objetivo de ${row.name}`} value={row.rir} onChange={(e) => onChange({ rir: e.target.value })}>
          <option value="">—</option>
          {[0, 1, 2, 3, 4].map((v) => (
            <option key={v} value={v}>
              {v === 4 ? "4+" : v}
            </option>
          ))}
        </select>
      </label>
      <RowMenu label={`Más acciones de ${row.name}`} items={items} />
      {editingNote && (
        <div className="bld-note-edit">
          <label className="bld-lbl" htmlFor={`bld-note-${row.key}`}>
            Nota para el atleta (opcional)
          </label>
          <textarea
            id={`bld-note-${row.key}`}
            rows={2}
            maxLength={NOTE_MAX_LENGTH}
            placeholder="Por ejemplo: baja lento y cuida el hombro"
            value={row.note}
            autoFocus
            onChange={(e) => onChange({ note: e.target.value })}
            onBlur={() => setEditingNote(false)}
          />
        </div>
      )}
    </div>
  );
}
