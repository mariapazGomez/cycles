import type { WorkBlockType } from "@cycles/shared";
import { BLOCK_TYPE_COLOR, BLOCK_TYPE_LABEL } from "../../lib/workBlocks";
import { CHOOSABLE_TYPES, MAX_BLOCKS } from "../../lib/blocksDraft";

// «Agregar bloque»: los tipos como botones de color en una sola fila. El personalizado
// se crea con nombre y color editables (se abre su configuración al crearlo).
export function AddBlockBar({ count, onAdd }: { count: number; onAdd: (type: WorkBlockType) => void }) {
  const full = count >= MAX_BLOCKS;
  return (
    <section className="bld-block bld-addblock" aria-label="Agregar bloque" data-tour="drawer-add-block">
      <h3>Agregar bloque</h3>
      {full ? (
        <p className="bld-empty">Llegaste al máximo de {MAX_BLOCKS} bloques.</p>
      ) : (
        <div className="bld-chips">
          {CHOOSABLE_TYPES.map((type) => (
            <button key={type} type="button" className="bld-chip" style={{ ["--block-color" as string]: type === "custom" ? "var(--color-gray-mid)" : BLOCK_TYPE_COLOR[type] }} onClick={() => onAdd(type)}>
              <i aria-hidden="true" />
              {BLOCK_TYPE_LABEL[type]}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
