import { useId, useRef, type ReactNode } from "react";
import { useDialogFocus } from "../../hooks/useDialogFocus";

// Diálogo modal de la guía: atrapa el foco, se cierra con Esc y lo devuelve a
// donde estaba. `onClose` es la salida sin elegir (se trata como «Ahora no»).
export function TourDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialogFocus(ref as React.RefObject<HTMLElement>, onClose);
  return (
    <div className="tour-scrim">
      <div ref={ref} className="tour-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
