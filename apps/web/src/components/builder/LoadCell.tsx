import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { calcLoadKg, formatLoad } from "@cycles/shared";
import { isValidPercent, rowLoadMode, type LoadMode, type Row } from "../../lib/routineRows";
import { useRmContext } from "./RmContext";

// La celda de Carga: un número y un menú «kg / % RM» (CYC-312). Peso fijo: el mismo kg para
// todos. % del RM: cada atleta recibe su peso según su RM. En la sesión de una persona, «% del
// RM» se desactiva donde no tiene RM y dice por qué.
export function LoadCell({ row, bad, onChange }: { row: Row; bad: boolean; onChange: (patch: Partial<Row>) => void }) {
  const rm = useRmContext();
  const mode = rowLoadMode(row);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const percentBlocked = rm != null && !rm.preview && !rm.hasRm(row.exerciseId) && mode !== "percent";
  // Peso que se muestra bajo la carga: el calculado por la API (sesión) o, en la vista previa de una
  // rutina, el de la persona elegida.
  const previewRm = rm?.preview ? rm.rmKg(row.exerciseId) : null;
  const shownKg =
    mode !== "percent" ? null : rm?.preview ? (previewRm != null && isValidPercent(row.percentRm) ? calcLoadKg(Number(row.percentRm), previewRm) : null) : (row.resolvedKg ?? null);
  const reason = percentBlocked ? `${rm.athleteName} no tiene RM en ${row.name}` : null;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(next: LoadMode) {
    setOpen(false);
    onChange({ loadMode: next });
  }

  const value = mode === "percent" ? (row.percentRm ?? "") : row.weight;
  const percentBad = mode === "percent" && value.trim() !== "" && !isValidPercent(value);

  return (
    <div className="bld-load" ref={ref}>
      <input
        className={`bld-f${bad || percentBad ? " bld-bad" : ""}`}
        inputMode={mode === "percent" ? "numeric" : "decimal"}
        placeholder={mode === "percent" ? "%" : "kg"}
        aria-label={mode === "percent" ? `% del RM de ${row.name}` : `Carga en kg de ${row.name}`}
        value={value}
        onChange={(e) => onChange(mode === "percent" ? { percentRm: e.target.value } : { weight: e.target.value })}
      />
      <button type="button" className="bld-unit" aria-haspopup="menu" aria-expanded={open} aria-label={`Tipo de carga de ${row.name}`} onClick={() => setOpen((v) => !v)}>
        {mode === "percent" ? "% RM" : "kg"} <span aria-hidden="true">⌄</span>
      </button>
      {open && (
        <div className="bld-load-menu" role="menu">
          <button type="button" role="menuitemradio" aria-checked={mode === "kg"} onClick={() => choose("kg")}>
            <b>Peso fijo</b>
            <span>{rm ? "Un peso en kg" : "Un peso en kg igual para todos"}</span>
          </button>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={mode === "percent"}
            aria-disabled={percentBlocked}
            className={percentBlocked ? "bld-load-off" : undefined}
            onClick={() => !percentBlocked && choose("percent")}
          >
            <b>% del RM</b>
            <span>{reason ?? "Cada atleta, según su RM"}</span>
          </button>
          {percentBlocked && rm && (
            <>
              <Link className="bld-load-exit" role="menuitem" to={`/athletes/${rm.athleteId}?vista=rm`}>
                Ingresar el RM de {rm.athleteName}
              </Link>
              <Link className="bld-load-exit" role="menuitem" to={`/athletes/${rm.athleteId}?vista=rm`}>
                Calcular un RM aproximado
              </Link>
            </>
          )}
        </div>
      )}
      {shownKg != null && <span className="bld-weight" title={rm?.preview ? `Peso de ${rm.athleteName}` : undefined}>{formatLoad(shownKg)}</span>}
      {mode === "percent" && rm != null && shownKg == null && !rm.hasRm(row.exerciseId) && <span className="bld-weight bld-weight-off">Sin RM</span>}
    </div>
  );
}
