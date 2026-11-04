import type { ReactNode } from "react";

export function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="card" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={i % 2 ? "sk short" : "sk"} />
      ))}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="banner err" role="alert">
      {message}
      <button className="btn sm" onClick={onRetry}>
        Reintentar
      </button>
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card empty">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
