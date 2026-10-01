import { ReactNode } from "react";
import { PATTERNS } from "../assets/patterns";

interface EmptyStateProps {
  title: string;
  children: ReactNode;
}

// Estado vacío con el motivo de marca: una tarjeta sobre las cadenas de proteína.
export function EmptyState({ title, children }: EmptyStateProps) {
  return (
    <div className="empty-state" style={{ backgroundImage: `url(${PATTERNS.c})` }}>
      <div className="empty-state-card">
        <h2 className="section-title">{title}</h2>
        <p>{children}</p>
      </div>
    </div>
  );
}
