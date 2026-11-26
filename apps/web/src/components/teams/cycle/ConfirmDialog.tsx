import { useRef, type ReactNode } from "react";
import { useDialogFocus } from "../../../hooks/useDialogFocus";

// Aviso antes de quitar algo del ciclo del equipo: dice qué se quita y qué se conserva.
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  busyLabel,
  busy,
  disabled,
  error,
  onConfirm,
  onClose,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busyLabel: string;
  busy: boolean;
  disabled?: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, onClose);
  return (
    <div className="bd-modal-wrap">
      <div className="bd-modal-scrim" onClick={onClose} />
      <div ref={ref} className="bd-modal tmc-modal" role="alertdialog" aria-modal="true" aria-labelledby="tmc-confirm-title" aria-describedby="tmc-confirm-body">
        <header>
          <h2 id="tmc-confirm-title">{title}</h2>
        </header>
        <div className="bd-modal-body">
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          <div id="tmc-confirm-body">{children}</div>
          <footer>
            <button type="button" className="bd-btn" data-autofocus onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="bd-btn tm-danger" disabled={busy || disabled} onClick={onConfirm}>
              {busy ? busyLabel : confirmLabel}
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}

export function ImpactList({ lines }: { lines: string[] }) {
  return (
    <ul className="tmc-impact">
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}
