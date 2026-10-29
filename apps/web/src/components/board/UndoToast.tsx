import type { BoardToast } from "../../hooks/useBoardActions";

export function UndoToast({ toast, onDismiss }: { toast: BoardToast | null; onDismiss: () => void }) {
  if (!toast) return null;
  return (
    <div className="bd-toast" role="status">
      <span>{toast.message}</span>
      {toast.undo && (
        <button
          type="button"
          onClick={() => {
            toast.undo?.();
            onDismiss();
          }}
        >
          Deshacer
        </button>
      )}
    </div>
  );
}
