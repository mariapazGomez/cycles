import { useEffect, useState } from "react";

// Si la espera pasa de unos segundos, casi siempre es la API despertando
// (Render gratis la duerme tras 15 minutos sin tráfico): se avisa para que
// nadie crea que la página se rompió.
const SLOW_AFTER_MS = 4000;

export function LoadingScreen() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="auth-shell">
      <div role="status" className="loading-box">
        <p>Cargando…</p>
        {slow && (
          <p className="loading-hint">
            Estamos despertando el servidor. La primera vez del día puede tardar hasta un minuto.
          </p>
        )}
      </div>
    </div>
  );
}
