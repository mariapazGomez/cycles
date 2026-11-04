import { useState, type FormEvent } from "react";
import { api, ApiError, SessionEnded, type Versions } from "../api";
import { useLoad } from "../useLoad";
import { ErrorBanner, Skeleton } from "../components/Bits";
import { formatDate } from "../format";

// Solo direcciones públicas de los paneles. De 1Password va el nombre de la
// bóveda, nunca un enlace a un secreto.
const LINKS: Array<{ name: string; hint: string; href?: string }> = [
  { name: "PostHog", hint: "Uso del piloto", href: "https://eu.posthog.com" },
  { name: "Linear", hint: "Tareas", href: "https://linear.app" },
  { name: "Resend", hint: "Correos", href: "https://resend.com/emails" },
  { name: "Supabase", hint: "Base de datos", href: "https://supabase.com/dashboard" },
  { name: "Render", hint: "API", href: "https://dashboard.render.com" },
  { name: "Vercel", hint: "Web", href: "https://vercel.com/dashboard" },
  { name: "App Store Connect", hint: "App iOS", href: "https://appstoreconnect.apple.com" },
  { name: "1Password", hint: "Bóveda: Cycles" },
];

export function LinksTab({ onSessionEnded }: { onSessionEnded: () => void }) {
  const versions = useLoad(() => api<Versions>("/admin/versions"), "versions", onSessionEnded);
  return (
    <>
      <div className="card section">
        <h3>Enlaces rápidos</h3>
        <div className="grid">
          {LINKS.map((l) =>
            l.href ? (
              <a key={l.name} className="lnk" href={l.href} target="_blank" rel="noreferrer noopener">
                {l.name}
                <small>{l.hint} ↗</small>
              </a>
            ) : (
              <div key={l.name} className="lnk static">
                {l.name}
                <small>{l.hint}</small>
              </div>
            ),
          )}
        </div>
      </div>

      {versions.state.status === "loading" && <Skeleton rows={4} />}
      {versions.state.status === "error" && (
        <ErrorBanner message="No pudimos leer las versiones. Inténtalo de nuevo." onRetry={versions.reload} />
      )}
      {versions.state.status === "ok" && <VersionsTable v={versions.state.data} onSessionEnded={onSessionEnded} />}
    </>
  );
}

function VersionsTable({ v, onSessionEnded }: { v: Versions; onSessionEnded: () => void }) {
  const [ios, setIos] = useState(v.ios.version ?? "");
  // Lo guardado se muestra al instante, sin volver a cargar la tabla.
  const [shown, setShown] = useState({ version: v.ios.version, updatedAt: v.ios.updatedAt });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("/admin/settings/ios-version", { method: "PUT", body: { value: ios } });
      setMessage(ios.trim() ? "Versión de iOS guardada." : "Versión de iOS borrada.");
      setShown({ version: ios.trim() || null, updatedAt: ios.trim() ? new Date().toISOString() : null });
    } catch (e) {
      if (e instanceof SessionEnded) onSessionEnded();
      else setError(e instanceof ApiError ? e.message : "No pudimos guardar. Inténtalo de nuevo.");
    }
    setBusy(false);
  };

  return (
    <div className="card section">
      <table>
        <caption>Versiones y entornos</caption>
        <thead>
          <tr>
            <th scope="col">Servicio</th>
            <th scope="col">Entorno</th>
            <th scope="col">Versión</th>
            <th scope="col">Detalle</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td data-l="Servicio"><b>API</b></td>
            <td data-l="Entorno">Render · Producción</td>
            <td data-l="Versión">{v.api.commit ? <code>{v.api.commit}</code> : "Sin dato"}</td>
            <td data-l="Detalle">Commit desplegado</td>
          </tr>
          <tr>
            <td data-l="Servicio"><b>Base</b></td>
            <td data-l="Entorno">Supabase · Producción</td>
            <td data-l="Versión">{v.database.lastMigration ? <code>{v.database.lastMigration}</code> : "Sin dato"}</td>
            <td data-l="Detalle">{v.database.appliedAt ? `Última migración · ${formatDate(v.database.appliedAt)}` : "Última migración"}</td>
          </tr>
          <tr>
            <td data-l="Servicio"><b>Política de privacidad</b></td>
            <td data-l="Entorno">Vigente</td>
            <td data-l="Versión">v{v.policyVersion}</td>
            <td data-l="Detalle">La que aceptan las cuentas nuevas</td>
          </tr>
          <tr>
            <td data-l="Servicio"><b>App iOS</b></td>
            <td data-l="Entorno">TestFlight o App Store</td>
            <td data-l="Versión">{shown.version ?? "Sin dato"}</td>
            <td data-l="Detalle">{shown.updatedAt ? `Escrita a mano · ${formatDate(shown.updatedAt)}` : "Se escribe a mano"}</td>
          </tr>
        </tbody>
      </table>
      <form className="ios-form" onSubmit={save}>
        <label htmlFor="ios-version">Versión de la app iOS</label>
        <input id="ios-version" className="inp" maxLength={60} value={ios} onChange={(e) => setIos(e.target.value)} placeholder="Por ejemplo, 1.0.0 (23)" />
        <button className="btn p" type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
      </form>
      <div className="sr" aria-live="polite">{message}</div>
      {message && <div className="banner ok" role="status">{message}</div>}
      {error && <div className="banner err" role="alert">{error}</div>}
      <p className="fine">El estado de la última compilación de la web y de la app no se lee automáticamente.</p>
    </div>
  );
}
