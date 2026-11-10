import { useState } from "react";
import { DragDropContext, Draggable, Droppable, type DragStart, type DragUpdate, type DropResult, type ResponderProvided } from "@hello-pangea/dnd";
import type { Exercise } from "@cycles/shared";
import type { useStructureDraft } from "../../hooks/useStructureDraft";
import { AddBlockBar } from "./AddBlockBar";
import { BlockCard } from "./BlockCard";

type Draft = ReturnType<typeof useStructureDraft>;

// Los bloques del constructor con su arrastre (@hello-pangea/dnd) y el botón de agregar
// bloque. Lo usan la página de la rutina y la de la sesión (CYC-275). Los anuncios para
// lectores de pantalla van en español.
export function BuilderBlocks({
  draft,
  exercises,
  locked = false,
  tour = false,
}: {
  draft: Draft;
  exercises: { data: Exercise[] | undefined; isLoading: boolean; isError: boolean };
  // Sesión bloqueada: sin arrastre ni cambios.
  locked?: boolean;
  // Anclas de la guía de la coach (solo en la página de la rutina).
  tour?: boolean;
}) {
  const [draggingRow, setDraggingRow] = useState(false);
  const blocks = draft.structure.blocks;

  const rowName = (key: string) => draft.structure.rows.find((r) => r.key === key)?.name ?? "el ejercicio";
  const blockName = (key: string | null) => (key && key !== "loose" ? (blocks.find((b) => b.key === key)?.name ?? "el bloque") : "ejercicios sin bloque");
  const labelOf = (id: string, type: string) => (type === "BLOCK" ? `el bloque ${blockName(id)}` : rowName(id));

  function onDragStart(start: DragStart, provided: ResponderProvided) {
    setDraggingRow(start.type === "ROW");
    provided.announce(`Levantaste ${labelOf(start.draggableId, start.type)}, posición ${start.source.index + 1}. Usa las flechas para moverlo, Espacio para soltarlo y Escape para cancelar.`);
  }

  function onDragUpdate(update: DragUpdate, provided: ResponderProvided) {
    if (!update.destination) return provided.announce("Ahora no está sobre ningún lugar válido.");
    const where = update.type === "ROW" ? ` en ${blockName(update.destination.droppableId)}` : "";
    provided.announce(`${labelOf(update.draggableId, update.type)}: posición ${update.destination.index + 1}${where}.`);
  }

  function onDragEnd(result: DropResult, provided: ResponderProvided) {
    setDraggingRow(false);
    const { destination, source, draggableId, type } = result;
    if (!destination) return provided.announce("Movimiento cancelado. Quedó donde estaba.");
    if (type === "BLOCK") draft.dropBlock(source.index, destination.index);
    else draft.dropRow(draggableId, destination.droppableId === "loose" ? null : destination.droppableId, destination.index);
    const where = type === "ROW" ? ` en ${blockName(destination.droppableId)}` : "";
    provided.announce(`Soltaste ${labelOf(draggableId, type)}${where}, posición ${destination.index + 1}.`);
  }

  const actions = {
    addExercise: draft.addExercise,
    updateRow: draft.updateRow,
    duplicateRow: draft.duplicateRow,
    removeRow: draft.removeRow,
    moveRowInBlock: draft.moveRowInBlock,
    canMoveRow: draft.canMoveRow,
    moveRowToBlock: draft.moveRowToBlock,
    updateBlock: draft.updateBlock,
    removeBlock: draft.removeBlock,
    moveBlock: draft.moveBlock,
  };
  const common = { blocks, attempted: draft.attempted, actions, exercises, draggingRow, locked };

  return (
    <DragDropContext
      onDragStart={onDragStart}
      onDragUpdate={onDragUpdate}
      onDragEnd={onDragEnd}
      dragHandleUsageInstructions="Presiona Espacio para levantar. Con las flechas lo mueves, Espacio lo suelta y Escape cancela. También puedes usar el menú de acciones."
    >
      <div className="bld-main" data-tour={tour ? "drawer-exercises" : undefined}>
        {draft.views.length === 0 && <p className="bld-empty">Agrega el primer bloque o un ejercicio para empezar.</p>}
        <Droppable droppableId="blocks" type="BLOCK" isDropDisabled={locked}>
          {(dropProvided) => (
            <div ref={dropProvided.innerRef} {...dropProvided.droppableProps} className="bld-blocks">
              {blocks.map((block, index) => {
                const view = draft.views.find((v) => v.block?.key === block.key);
                if (!view) return null;
                return (
                  <Draggable key={block.key} draggableId={block.key} index={index} isDragDisabled={locked}>
                    {(drag) => <BlockCard view={view} index={index} count={blocks.length} drag={drag} {...common} />}
                  </Draggable>
                );
              })}
              {dropProvided.placeholder}
            </div>
          )}
        </Droppable>
        {draft.views
          .filter((v) => !v.block)
          .map((view) => (
            <BlockCard key="loose" view={view} index={blocks.length} count={blocks.length} {...common} />
          ))}
        {blocks.length === 0 && draft.structure.rows.length === 0 && <BlockCard view={{ block: null, rows: [] }} index={0} count={0} {...common} />}
        <AddBlockBar count={blocks.length} onAdd={draft.addBlock} />
      </div>
    </DragDropContext>
  );
}
