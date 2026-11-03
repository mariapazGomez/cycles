import { useState } from "react";
import { Link } from "react-router-dom";
import type { User } from "@cycles/shared";

type Phone = NonNullable<User["phonePlatform"]>;

// Traspaso web → app después de aceptar la invitación (reemplaza el «Listo»).
// Si la API ya sabe qué teléfono eligió la persona, muestra directo lo que
// corresponde; si no, un selector iPhone / Android.
export function AppHandoff({
  phonePlatform,
  email,
  onBrowser,
  loginHref,
}: {
  phonePlatform: User["phonePlatform"];
  email: string | undefined;
  // Seguir en el navegador (ya con sesión). Sin sesión, se manda a iniciar sesión.
  onBrowser?: () => void;
  loginHref?: string;
}) {
  const [picked, setPicked] = useState<Phone | null>(null);
  const phone = phonePlatform ?? picked;

  return (
    <div className="handoff">
      <p>Entrenas desde la app. Entra con {email ?? "el correo de tu invitación"}.</p>

      {!phonePlatform && (
        <fieldset className="field phone-choice">
          <legend>¿Qué teléfono usas?</legend>
          <label className="checkbox-field">
            <input type="radio" name="handoff-phone" checked={picked === "ios"} onChange={() => setPicked("ios")} />
            <span>iPhone</span>
          </label>
          <label className="checkbox-field">
            <input type="radio" name="handoff-phone" checked={picked === "android"} onChange={() => setPicked("android")} />
            <span>Android</span>
          </label>
        </fieldset>
      )}

      {phone === "ios" && (
        <p className="handoff-block" role="status">
          Cycles se instala con TestFlight. Cuando tengas la invitación, ábrela con el correo de tu Apple ID.
        </p>
      )}
      {phone === "android" && (
        <p className="handoff-block" role="status">
          Abre <b>app.getcycles.app</b> en Chrome y agrégala a tu pantalla de inicio.
        </p>
      )}

      {onBrowser ? (
        <button type="button" className="button-secondary" onClick={onBrowser}>
          Seguir en el navegador
        </button>
      ) : (
        <Link to={loginHref ?? "/login"} className="button-secondary" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
          Seguir en el navegador
        </Link>
      )}
    </div>
  );
}
