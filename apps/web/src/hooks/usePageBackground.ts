import { useEffect } from "react";

// Pone el fondo gris azulado detrás de las tarjetas mientras la pantalla está
// montada (Inicio del coach, detalle de un plan). Ver styles/home.css.
export function usePageBackground() {
  useEffect(() => {
    document.body.classList.add("hm-bg");
    return () => document.body.classList.remove("hm-bg");
  }, []);
}
