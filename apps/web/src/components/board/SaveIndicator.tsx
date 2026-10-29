import type { SaveStatus } from "../../hooks/useBoardActions";

// Guardando… / Guardado / No se guardó: el estado del último gesto (no hay botón Guardar).
export function SaveIndicator({ status }: { status: SaveStatus }) {
  return (
    <span className={`bd-save${status === "saved" ? " bd-save-ok" : ""}${status === "error" ? " bd-save-err" : ""}`} role="status" aria-live="polite">
      {status === "saving" && (
        <>
          <span className="bd-spin" aria-hidden="true" /> Guardando…
        </>
      )}
      {status === "saved" && "Guardado"}
      {status === "error" && "No se guardó"}
    </span>
  );
}
