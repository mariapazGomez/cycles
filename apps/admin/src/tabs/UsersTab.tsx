import { useEffect, useState } from "react";
import { api, type AccessLogRow, type Summary, type UserDetail, type UsersPage } from "../api";
import { useLoad } from "../useLoad";
import { Empty, ErrorBanner, Skeleton } from "../components/Bits";
import { Drawer } from "../components/Drawer";
import { formatDate, formatDateTime, relativeDay, roleLabel } from "../format";

type Kind = "real" | "demo";

export function UsersTab({ onSessionEnded }: { onSessionEnded: () => void }) {
  const [kind, setKind] = useState<Kind>("real");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [verified, setVerified] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  // La búsqueda espera un momento a que termines de escribir.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const summary = useLoad(() => api<Summary>("/admin/summary"), "summary", onSessionEnded);
  const params = new URLSearchParams({ kind, page: String(page) });
  if (search) params.set("q", search);
  if (role) params.set("role", role);
  if (verified) params.set("verified", verified);
  const users = useLoad(() => api<UsersPage>(`/admin/users?${params}`), params.toString(), onSessionEnded);

  const change = (fn: () => void) => {
    fn();
    setPage(1);
  };

  return (
    <>
      {summary.state.status === "ok" && <Totals summary={summary.state.data} />}

      <div className="tools">
        <div className="seg" role="group" aria-label="Tipo de cuenta">
          <button aria-pressed={kind === "real"} onClick={() => change(() => setKind("real"))}>
            Reales{summary.state.status === "ok" ? ` ${summary.state.data.real.total}` : ""}
          </button>
          <button aria-pressed={kind === "demo"} onClick={() => change(() => setKind("demo"))}>
            Demo{summary.state.status === "ok" ? ` ${summary.state.data.demo.total}` : ""}
          </button>
        </div>
        <input
          className="inp"
          type="search"
          placeholder="Buscar por nombre o correo"
          aria-label="Buscar por nombre o correo"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="inp" aria-label="Rol" value={role} onChange={(e) => change(() => setRole(e.target.value))}>
          <option value="">Todos los roles</option>
          <option value="coach">Coach</option>
          <option value="athlete">Atleta</option>
        </select>
        <select className="inp" aria-label="Verificación" value={verified} onChange={(e) => change(() => setVerified(e.target.value))}>
          <option value="">Verificación: todas</option>
          <option value="yes">Correo verificado</option>
          <option value="no">Sin verificar</option>
        </select>
      </div>

      {kind === "demo" && <div className="banner demo">Cuentas ficticias. No cuentan en ninguna métrica.</div>}

      {users.state.status === "loading" && <Skeleton rows={5} />}
      {users.state.status === "error" && (
        <ErrorBanner message="No pudimos cargar los usuarios. Inténtalo de nuevo." onRetry={users.reload} />
      )}
      {users.state.status === "ok" && (
        <UsersTable data={users.state.data} kind={kind} filtered={Boolean(search || role || verified)} onOpen={setOpenId} onPage={setPage} />
      )}

      <AccessLog onSessionEnded={onSessionEnded} />
      {openId && <UserDrawer id={openId} onClose={() => setOpenId(null)} onSessionEnded={onSessionEnded} />}
    </>
  );
}

function Totals({ summary }: { summary: Summary }) {
  return (
    <div className="kpis">
      <div className="card kpi">
        <b>{summary.real.total}</b>
        <span>Cuentas reales</span>
      </div>
      <div className="card kpi">
        <b>{summary.real.coaches}</b>
        <span>Coaches</span>
      </div>
      <div className="card kpi">
        <b>{summary.real.athletes}</b>
        <span>Atletas</span>
      </div>
      <div className="card kpi">
        <b>{summary.registrations.last7Days}</b>
        <span>Registros en 7 días</span>
      </div>
      <div className="card kpi">
        <b>
          {summary.coachesWithInvitedAthletes.count} de {summary.coachesWithInvitedAthletes.of}
        </b>
        <span>Coaches con atletas invitados</span>
      </div>
      <div className="card kpi">
        <b>
          {summary.athletesWithClosedSession.count} de {summary.athletesWithClosedSession.of}
        </b>
        <span>Atletas con al menos una sesión</span>
      </div>
      <div className="card kpi demo">
        <b>{summary.demo.total}</b>
        <span>Cuentas demo (aparte)</span>
      </div>
    </div>
  );
}

function UsersTable({
  data,
  kind,
  filtered,
  onOpen,
  onPage,
}: {
  data: UsersPage;
  kind: Kind;
  filtered: boolean;
  onOpen: (id: string) => void;
  onPage: (page: number) => void;
}) {
  if (data.items.length === 0) {
    return filtered ? (
      <Empty title="Sin resultados">Prueba con otra búsqueda o quita los filtros.</Empty>
    ) : (
      <Empty title={kind === "real" ? "Aún no hay cuentas reales" : "No hay cuentas demo"}>
        {kind === "real" ? "Cuando alguien se registre, aparecerá aquí." : null}
      </Empty>
    );
  }
  const from = (data.page - 1) * data.pageSize + 1;
  const to = from + data.items.length - 1;
  const lastPage = Math.max(1, Math.ceil(data.total / data.pageSize));
  return (
    <div className="card">
      <table>
        <caption className="sr">{kind === "demo" ? "Cuentas demo" : "Cuentas reales"}</caption>
        <thead>
          <tr>
            <th scope="col">Nombre y correo</th>
            <th scope="col">Rol</th>
            <th scope="col">Registro</th>
            <th scope="col">Correo verificado</th>
            <th scope="col">Política</th>
            <th scope="col">Último ingreso</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((u) => (
            <tr key={u.id} className={u.isDemo ? "demo" : undefined}>
              <td data-l="Nombre">
                <button className="link" onClick={() => onOpen(u.id)}>
                  {u.name}
                </button>
                {u.isDemo && <span className="tag demo">Demo</span>}
                <small>{u.email}</small>
              </td>
              <td data-l="Rol">{roleLabel(u.role)}</td>
              <td data-l="Registro">{formatDate(u.createdAt)}</td>
              <td data-l="Verificado">{u.emailVerified ? "✓ Sí" : "No"}</td>
              <td data-l="Política">{u.policy ? `v${u.policy}` : <span className="tag warn">Pendiente</span>}</td>
              <td data-l="Último ingreso" title={u.lastLoginAt ? formatDateTime(u.lastLoginAt) : undefined}>
                {relativeDay(u.lastLoginAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pager">
        <span aria-live="polite">
          {from}–{to} de {data.total}
        </span>
        <span>
          <button className="btn sm" disabled={data.page <= 1} onClick={() => onPage(data.page - 1)}>
            Anterior
          </button>{" "}
          <button className="btn sm" disabled={data.page >= lastPage} onClick={() => onPage(data.page + 1)}>
            Siguiente
          </button>
        </span>
      </div>
    </div>
  );
}

function UserDrawer({ id, onClose, onSessionEnded }: { id: string; onClose: () => void; onSessionEnded: () => void }) {
  const detail = useLoad(() => api<UserDetail>(`/admin/users/${encodeURIComponent(id)}`), id, onSessionEnded);
  const d = detail.state.status === "ok" ? detail.state.data : null;
  return (
    <Drawer title={d?.name ?? "Detalle de la cuenta"} onClose={onClose}>
      {detail.state.status === "loading" && <Skeleton rows={4} />}
      {detail.state.status === "error" && <ErrorBanner message="No pudimos cargar esta cuenta." onRetry={detail.reload} />}
      {d && (
        <table>
          <tbody>
            <tr><th scope="row">Correo</th><td>{d.email}</td></tr>
            <tr><th scope="row">Rol</th><td>{roleLabel(d.role)}{d.isDemo && <span className="tag demo">Demo</span>}</td></tr>
            <tr><th scope="row">Teléfono</th><td>{d.phonePlatform ?? "Sin dato"}</td></tr>
            <tr><th scope="row">Tour de primer uso</th><td>{TOUR[d.tourStatus] ?? d.tourStatus}</td></tr>
            <tr><th scope="row">Registro</th><td>{formatDate(d.createdAt)}</td></tr>
            <tr><th scope="row">Último ingreso</th><td>{d.lastLoginAt ? formatDateTime(d.lastLoginAt) : "Sin dato"}</td></tr>
            {d.athletes.length > 0 && (
              <tr><th scope="row">Atletas</th><td>{d.athletes.map((a) => `${a.name} (${REL[a.status] ?? a.status})`).join(", ")}</td></tr>
            )}
            {d.coaches.length > 0 && (
              <tr><th scope="row">Coaches</th><td>{d.coaches.map((c) => `${c.name} (${REL[c.status] ?? c.status})`).join(", ")}</td></tr>
            )}
          </tbody>
        </table>
      )}
    </Drawer>
  );
}

const TOUR: Record<string, string> = { pending: "Pendiente", skipped: "Omitido", completed: "Completado" };
const REL: Record<string, string> = { active: "activa", pending: "invitación pendiente", inactive: "inactiva" };

function AccessLog({ onSessionEnded }: { onSessionEnded: () => void }) {
  const [open, setOpen] = useState(false);
  const log = useLoad(() => (open ? api<AccessLogRow[]>("/admin/access-log") : Promise.resolve([])), String(open), onSessionEnded);
  return (
    <details className="card log" onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>Registro de consultas</summary>
      {open && log.state.status === "loading" && <Skeleton rows={2} />}
      {open && log.state.status === "error" && <ErrorBanner message="No pudimos cargar el registro." onRetry={log.reload} />}
      {open && log.state.status === "ok" && (
        <table>
          <thead>
            <tr><th scope="col">Quién</th><th scope="col">Vista</th><th scope="col">Detalle</th><th scope="col">Cuándo</th></tr>
          </thead>
          <tbody>
            {log.state.data.map((r, i) => (
              <tr key={i}>
                <td data-l="Quién">{r.email}</td>
                <td data-l="Vista">{r.view}</td>
                <td data-l="Detalle">{r.detail ?? "—"}</td>
                <td data-l="Cuándo">{formatDateTime(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </details>
  );
}
