import { useMemo, useState } from "react";
import { api, ApiError, type Usage, type UsageUser } from "../api";
import { useLoad } from "../useLoad";
import { Empty, ErrorBanner, Skeleton } from "../components/Bits";
import { formatDateTime, roleLabel } from "../format";

type SortKey = "visits" | "logins" | "routines" | "cycles" | "sessions" | "lastAt";
const COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: "visits", label: "Visitas" },
  { key: "logins", label: "Ingresos" },
  { key: "routines", label: "Rutinas" },
  { key: "cycles", label: "Ciclos" },
  { key: "sessions", label: "Sesiones" },
  { key: "lastAt", label: "Último evento" },
];

export function UsageTab({ onSessionEnded }: { onSessionEnded: () => void }) {
  const [days, setDays] = useState<7 | 30>(7);
  const usage = useLoad(() => api<Usage>(`/admin/usage?days=${days}`), String(days), onSessionEnded);

  return (
    <>
      <div className="tools">
        <div className="seg" role="group" aria-label="Periodo">
          <button aria-pressed={days === 7} onClick={() => setDays(7)}>7 días</button>
          <button aria-pressed={days === 30} onClick={() => setDays(30)}>30 días</button>
        </div>
        <span className="tag">Sin cuentas demo</span>
        <span className="spacer" />
        <a className="btn sm" href="https://eu.posthog.com" target="_blank" rel="noreferrer noopener">
          Abrir PostHog ↗
        </a>
      </div>

      {usage.state.status === "loading" && <Skeleton rows={5} />}
      {usage.state.status === "error" && (
        <ErrorBanner
          message={
            usage.state.error instanceof ApiError && usage.state.error.code === "posthog_error"
              ? "No pudimos leer PostHog. Las demás pestañas siguen funcionando."
              : "No pudimos cargar el uso. Inténtalo de nuevo."
          }
          onRetry={usage.reload}
        />
      )}
      {usage.state.status === "ok" && usage.state.data.status === "not_connected" && (
        <div className="banner info" role="status">PostHog no está conectado. Falta la clave en el servidor.</div>
      )}
      {usage.state.status === "ok" && usage.state.data.status === "ok" && <UsageTables data={usage.state.data} />}
    </>
  );
}

function UsageTables({ data }: { data: Extract<Usage, { status: "ok" }> }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "visits", dir: "desc" });
  const rows = useMemo(() => {
    const value = (u: UsageUser) => (sort.key === "lastAt" ? (u.lastAt ? Date.parse(u.lastAt) : 0) : u[sort.key]);
    return [...data.users].sort((a, b) => (value(a) - value(b)) * (sort.dir === "asc" ? 1 : -1));
  }, [data.users, sort]);

  if (data.users.length === 0 && data.screens.length === 0) {
    return <Empty title="Aún no hay interacciones en este periodo">Prueba con 30 días.</Empty>;
  }
  const maxVisits = Math.max(1, ...data.screens.map((s) => s.visits));
  return (
    <>
      <div className="banner info">Solo web. La app iOS aún no se mide.</div>
      <div className="two">
        <div className="card">
          <table>
            <caption>Por usuario</caption>
            <thead>
              <tr>
                <th scope="col">Usuario</th>
                <th scope="col">Rol</th>
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    className={c.key === "lastAt" ? undefined : "num"}
                    aria-sort={sort.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    <button
                      className="sortbtn"
                      onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key && s.dir === "desc" ? "asc" : "desc" }))}
                    >
                      {c.label}
                      {sort.key === c.key ? (sort.dir === "asc" ? " ▴" : " ▾") : ""}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.distinctId}>
                  <td data-l="Usuario"><b>{u.name}</b></td>
                  <td data-l="Rol">{roleLabel(u.role)}</td>
                  <td className="num" data-l="Visitas">{u.visits}</td>
                  <td className="num" data-l="Ingresos">{u.logins}</td>
                  <td className="num" data-l="Rutinas">{u.routines || "—"}</td>
                  <td className="num" data-l="Ciclos">{u.cycles || "—"}</td>
                  <td className="num" data-l="Sesiones">{u.sessions || "—"}</td>
                  <td data-l="Último evento">{u.lastAt ? formatDateTime(u.lastAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <table>
            <caption>Por pantalla</caption>
            <thead>
              <tr><th scope="col">Ruta</th><th scope="col" className="num">Visitas</th></tr>
            </thead>
            <tbody>
              {data.screens.map((s) => (
                <tr key={s.path}>
                  <td data-l="Ruta">
                    <code>{cleanPath(s.path)}</code>
                    <div className="bar" style={{ width: `${Math.max(2, (s.visits / maxVisits) * 100)}%` }} aria-hidden="true" />
                  </td>
                  <td className="num" data-l="Visitas">{s.visits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// PostHog guarda la URL completa; mostramos solo la ruta y escondemos los IDs.
function cleanPath(url: string): string {
  let path = url;
  try {
    path = new URL(url).pathname;
  } catch {
    // ya era una ruta
  }
  return path.replace(/\/[0-9a-f]{8}-[0-9a-f-]{27}/gi, "/:id") || "/";
}
