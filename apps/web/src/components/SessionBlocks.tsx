import { ReactNode, useState } from "react";
import { BLOCK_TYPE_LABEL, BlockGroup, blockColor, blockSummary } from "../lib/workBlocks";

interface ExerciseLike {
  id: string;
  blockId?: string | null;
  orderIndex: number;
  targetSets: number;
}

// La sesión por bloques (CYC-268, docs/diseno/sesion-por-bloques): cada bloque es una
// tarjeta plegable con el color de su tipo, su nombre, su resumen y su nota. Lo que no
// tiene bloque (sesiones anteriores) sale como la lista de siempre, sin encabezado.
export function SessionBlocks<E extends ExerciseLike>({
  groups,
  renderExercise,
}: {
  groups: BlockGroup<E>[];
  renderExercise: (exercise: E) => ReactNode;
}) {
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setClosed((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <div className="session-blocks">
      {groups.map((group) => {
        if (!group.block) {
          return (
            <ul key="loose" className="session-blocks__loose">
              {group.exercises.map((e) => (
                <li key={e.id}>{renderExercise(e)}</li>
              ))}
            </ul>
          );
        }
        const { block } = group;
        const open = !closed.has(block.id);
        const bodyId = `bloque-${block.id}`;
        const color = blockColor(block);
        return (
          <section key={block.id} className="session-block" style={{ ["--block-color" as string]: color }} aria-label={`Bloque ${block.name}`}>
            <button type="button" className="session-block__head" aria-expanded={open} aria-controls={bodyId} onClick={() => toggle(block.id)}>
              <span className="session-block__pearl" aria-hidden="true" />
              <span className="session-block__title">
                <strong>{block.name}</strong>
                {block.type !== "custom" && block.name !== BLOCK_TYPE_LABEL[block.type] && <span className="session-block__type">{BLOCK_TYPE_LABEL[block.type]}</span>}
              </span>
              <span className="session-block__summary">{blockSummary(group.exercises)}</span>
              <span className="session-block__chevron" aria-hidden="true" data-open={open} />
            </button>
            {open && (
              <div id={bodyId} className="session-block__body">
                {block.note && <p className="session-block__note">{block.note}</p>}
                {group.exercises.length === 0 ? (
                  <p className="session-block__empty">Este bloque todavía no tiene ejercicios.</p>
                ) : (
                  <ul>
                    {group.exercises.map((e) => (
                      <li key={e.id}>{renderExercise(e)}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
