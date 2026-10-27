interface TypeIconProps {
  kind: "routine" | "cycle";
  small?: boolean;
}

// Ícono de tipo de la Biblioteca. Rutina: mancuerna sobre azul pálido. Ciclo:
// anillo (el isotipo) sobre tinta oscura. Es decorativo: la fila ya dice el
// tipo con texto.
export function TypeIcon({ kind, small = false }: TypeIconProps) {
  return (
    <span className={`lb-icon lb-icon-${kind}${small ? " lb-icon-sm" : ""}`} aria-hidden="true">
      {kind === "routine" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M19.5 11A7.5 7.5 0 0 0 7 6.2" />
          <path d="M4.5 13A7.5 7.5 0 0 0 17 17.8" />
        </svg>
      )}
    </span>
  );
}
