import { useEffect } from "react";

// Ensancha el contenido principal mientras la pantalla está montada (la pizarra
// del ciclo necesita columnas de unos 118 px). Ver styles/board.css.
export function usePageWide() {
  useEffect(() => {
    document.body.classList.add("wide-main");
    return () => document.body.classList.remove("wide-main");
  }, []);
}
