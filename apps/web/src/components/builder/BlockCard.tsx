import { useState } from "react";
import { Draggable, Droppable, type DraggableProvided } from "@hello-pangea/dnd";
import type { Exercise } from "@cycles/shared";
import { CUSTOM_BLOCK_COLORS } from "@cycles/shared";
import { ExercisePicker } from "../ExercisePicker";
import { BLOCK_TYPE_LABEL } from "../../lib/workBlocks";
import { BLOCK_NAME_MAX, CHOOSABLE_TYPES, blockColorOf, blockSummaryText, type BlockView, type DraftBlock } from "../../lib/blocksDraft";
import type { Row } from "../../lib/routineDraft";
import { ExerciseRowEditor } from "./ExerciseRowEditor";
import { RowMenu } from "./RowMenu";

export interface BlockCardActions {
  addExercise: (exercise: Exercise, blockKey: string | null) => string;
  updateRow: (key: string, patch: Partial<Row>) => void;
  duplicateRow: (key: string) => void;
  removeRow: (key: string) => void;
  moveRowInBlock: (key: string, direction: -1 | 1) => void;
  canMoveRow: (key: string, direction: -1 | 1) => boolean;
  moveRowToBlock: (key: string, blockKey: string | null) => void;
  updateBlock: (key: string, patch: Partial<Omit<DraftBlock, "key" | "id">>) => void;
  removeBlock: (key: string, label: string) => void;
  moveBlock: (key: string, direction: -1 | 1) => void;
}

// Un bloque de trabajo: encabezado con el color de su tipo, ejercicios en filas
// compactas y «Agregar ejercicio» al final. Los ejercicios sueltos (sin bloque) salen en
// una tarjeta neutra, sin encabezado de tipo.
export function BlockCard({
  view,
  index,
  count,
  blocks,
  attempted,
  actions,
  exercises,
  drag,
  draggingRow,
  locked = false,
}: {
  view: BlockView;
  index: number;
  count: number;
  blocks: DraftBlock[];
  attempted: boolean;
  actions: BlockCardActions;
  exercises: { data: Exercise[] | undefined; isLoading: boolean; isError: boolean };
  // Para arrastrar el bloque entero (no aplica a los ejercicios sueltos).
  drag?: DraggableProvided;
  // ¿Se está arrastrando un ejercicio? Un bloque plegado ofrece entonces dónde soltarlo.
  draggingRow: boolean;
  // Sesión bloqueada: no se arrastra nada.
  locked?: boolean;
}) {
  const { block, rows } = view;
  const [open, setOpen] = useState(true);
  const [settings, setSettings] = useState(false);
  const [adding, setAdding] = useState(false);
  const bodyId = `bld-body-${block?.key ?? "loose"}`;
  const color = block ? blockColorOf(block) : "var(--color-gray-mid)";

  return (
    <section ref={drag?.innerRef} {...(drag?.draggableProps ?? {})} className="bld-block" style={{ ...(drag?.draggableProps.style ?? {}), ["--block-color" as string]: color }} aria-label={block ? `Bloque ${block.name}` : "Ejercicios sin bloque"}>
      <header className="bld-bh">
        {drag && <span className="bld-grip" {...drag.dragHandleProps} aria-label={`Arrastrar el bloque ${block?.name ?? ""}`}>⠿</span>}
        <button type="button" className="bld-fold" aria-expanded={open} aria-controls={bodyId} aria-label={open ? "Plegar el bloque" : "Abrir el bloque"} onClick={() => setOpen((v) => !v)}>
          <span className="bld-chev" data-open={open} aria-hidden="true" />
        </button>
        <span className="bld-pearl" aria-hidden="true" />
        <div className="bld-title">
          {block ? <strong>{block.name}</strong> : <strong>Sin bloque</strong>}
          {block && block.type !== "custom" && block.name !== BLOCK_TYPE_LABEL[block.type] && <span className="bld-type">{BLOCK_TYPE_LABEL[block.type]}</span>}
        </div>
        <span className="bld-sum">{blockSummaryText(rows)}</span>
        {block && (
          <RowMenu
            label={`Más acciones del bloque ${block.name}`}
            items={[
              { label: "Editar bloque", onClick: () => setSettings(true) },
              { label: "Subir bloque", onClick: () => actions.moveBlock(block.key, -1), disabled: index === 0 },
              { label: "Bajar bloque", onClick: () => actions.moveBlock(block.key, 1), disabled: index >= count - 1 || count < 2 },
              { label: rows.some((r) => (r.loggedCount ?? 0) > 0) ? "Quitar bloque (tiene series registradas)" : "Quitar bloque", onClick: () => actions.removeBlock(block.key, block.name), danger: true, divider: true, disabled: rows.some((r) => (r.loggedCount ?? 0) > 0) },
            ]}
          />
        )}
      </header>

      {block && settings && (
        <div className="bld-settings">
          <div className="bld-set-row">
            <label className="bld-lbl" htmlFor={`bld-type-${block.key}`}>
              Tipo
            </label>
            <select id={`bld-type-${block.key}`} value={block.type} onChange={(e) => actions.updateBlock(block.key, { type: e.target.value as DraftBlock["type"] })}>
              {CHOOSABLE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {BLOCK_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="bld-set-row">
            <label className="bld-lbl" htmlFor={`bld-name-${block.key}`}>
              Nombre
            </label>
            <input id={`bld-name-${block.key}`} maxLength={BLOCK_NAME_MAX} value={block.name} onChange={(e) => actions.updateBlock(block.key, { name: e.target.value })} />
          </div>
          {block.type === "custom" && (
            <div className="bld-set-row">
              <span className="bld-lbl">Color</span>
              <div className="bld-swatches" role="radiogroup" aria-label="Color del bloque">
                {CUSTOM_BLOCK_COLORS.map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={block.color === c} aria-label={`Color ${c}`} className="bld-swatch" style={{ background: c }} onClick={() => actions.updateBlock(block.key, { color: c })} />
                ))}
              </div>
            </div>
          )}
          <div className="bld-set-row">
            <label className="bld-lbl" htmlFor={`bld-bnote-${block.key}`}>
              Nota del bloque (opcional)
            </label>
            <textarea id={`bld-bnote-${block.key}`} rows={2} maxLength={500} value={block.note} onChange={(e) => actions.updateBlock(block.key, { note: e.target.value })} />
          </div>
          <button type="button" className="bld-btn" onClick={() => setSettings(false)}>
            Listo
          </button>
        </div>
      )}

      {!open && draggingRow && (
        <Droppable droppableId={block?.key ?? "loose"} type="ROW">
          {(p) => (
            <div ref={p.innerRef} {...p.droppableProps} className="bld-dropstrip">
              Soltar aquí, al final del bloque
              {p.placeholder}
            </div>
          )}
        </Droppable>
      )}

      {open && (
        <div id={bodyId} className="bld-body">
          {block?.note && !settings && <p className="bld-bnote">{block.note}</p>}
          {rows.length > 0 && (
            <div className="bld-cols" aria-hidden="true">
              <span />
              <span>Ejercicio</span>
              <span>Ser.</span>
              <span>Reps</span>
              <span>Carga</span>
              <span>Desc.</span>
              <span>RIR</span>
              <span />
            </div>
          )}
          <Droppable droppableId={block?.key ?? "loose"} type="ROW">
            {(dropProvided, snapshot) => (
              <div ref={dropProvided.innerRef} {...dropProvided.droppableProps} className={`bld-rows${snapshot.isDraggingOver ? " bld-over" : ""}`}>
                {rows.length === 0 && !snapshot.isDraggingOver && <p className="bld-empty">Este bloque todavía no tiene ejercicios.</p>}
                {rows.map((row, i) => (
                  <Draggable key={row.key} draggableId={row.key} index={i} isDragDisabled={locked}>
                    {(p, snap) => (
                      <div ref={p.innerRef} {...p.draggableProps} className={`bld-item${snap.isDragging ? " bld-dragging" : ""}`}>
                        <ExerciseRowEditor
                          row={row}
                          blocks={blocks}
                          attempted={attempted}
                          canMoveUp={actions.canMoveRow(row.key, -1)}
                          canMoveDown={actions.canMoveRow(row.key, 1)}
                          onChange={(patch) => actions.updateRow(row.key, patch)}
                          onMoveUp={() => actions.moveRowInBlock(row.key, -1)}
                          onMoveDown={() => actions.moveRowInBlock(row.key, 1)}
                          onMoveToBlock={(target) => actions.moveRowToBlock(row.key, target)}
                          onDuplicate={() => actions.duplicateRow(row.key)}
                          onRemove={() => actions.removeRow(row.key)}
                          handleProps={p.dragHandleProps}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {dropProvided.placeholder}
              </div>
            )}
          </Droppable>
          <div className="bld-add">
            {adding ? (
              <>
                <ExercisePicker exercises={exercises.data} isLoading={exercises.isLoading} isError={exercises.isError} onPick={(exercise) => actions.addExercise(exercise, block?.key ?? null)} />
                <button type="button" className="bld-btn" onClick={() => setAdding(false)}>
                  Listo
                </button>
              </>
            ) : (
              <button type="button" className="bld-link" onClick={() => setAdding(true)}>
                + Agregar ejercicio
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
