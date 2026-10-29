import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

interface PopoverProps {
  // Elemento que lo abrió: se ancla a él y recupera el foco al cerrar.
  anchor: HTMLElement | null;
  label: string;
  onClose: () => void;
  width?: number;
  children: ReactNode;
}

// Popover flotante anclado a un botón. Se cierra con Escape o al hacer clic
// fuera, y devuelve el foco al botón que lo abrió.
export function Popover({ anchor, label, onClose, width = 280, children }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (!anchor || !ref.current) return;
    const place = () => {
      const rect = anchor.getBoundingClientRect();
      const height = ref.current?.offsetHeight ?? 0;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      const below = rect.bottom + 6;
      const top = below + height > window.innerHeight - 8 ? Math.max(8, rect.top - height - 6) : below;
      setPos({ left, top });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchor, width]);

  useEffect(() => {
    const first = ref.current?.querySelector<HTMLElement>("input, select, button:not([disabled]), a[href]");
    first?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    }
    function onDown(event: MouseEvent) {
      const target = event.target as Node;
      if (ref.current?.contains(target) || anchor?.contains(target)) return;
      onClose();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      anchor?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      className="bd-pop"
      role="dialog"
      aria-label={label}
      style={{ width, left: pos?.left ?? -9999, top: pos?.top ?? 0, visibility: pos ? "visible" : "hidden" }}
    >
      {children}
    </div>
  );
}
