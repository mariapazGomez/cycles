interface CheckBadgeProps {
  label?: string;
  small?: boolean;
}

// Sesión hecha: un check en un círculo verde. Reemplaza a la palabra
// "Completada"; el texto alternativo se conserva para lectores de pantalla.
export function CheckBadge({ label = "Completada", small = false }: CheckBadgeProps) {
  return (
    <span className={small ? "ok-badge ok-badge-sm" : "ok-badge"} role="img" aria-label={label}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
