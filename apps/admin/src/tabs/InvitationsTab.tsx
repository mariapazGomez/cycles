import { useRef, useState } from "react";
import { api, ApiError, SessionEnded, type InvitationRow, type InvitationsPage } from "../api";
import { useLoad } from "../useLoad";
import { Empty, ErrorBanner, Skeleton } from "../components/Bits";
import { capTaken, EMPTY, FILTERS, rowsFor, sendAction, shortDay, STATE_TAG, stateDetail, type Filter } from "../invitations";

const OFF_ID = "invitations-off";

// Invitaciones del piloto (CYC-295): una fila por correo que escribió. Enviar pide
// confirmación porque un correo no se puede deshacer; el servidor decide si sale o
// queda en cola.
export function InvitationsTab({ onSessionEnded }: { onSessionEnded: () => void }) {
  const load = useLoad(() => api<InvitationsPage>("/admin/invitations"), "invitations", onSessionEnded);
  // Al recargar se mantiene la tabla anterior, para que no parpadee.
  const last = useRef<InvitationsPage | null>(null);
  if (load.state.status === "ok") last.current = load.state.data;
  const page = last.current;

  const [filter, setFilter] = useState<Filter>("pending");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function run(email: string, request: () => Promise<string>, fallback: string) {
    setConfirming(null);
    setNotice("");
    setError("");
    setWorking(email);
    try {
      setNotice(await request());
    } catch (e) {
      if (e instanceof SessionEnded) {
        onSessionEnded();
        return;
      }
      setError(e instanceof ApiError ? e.message : fallback);
    } finally {
      setWorking(null);
      load.reload();
    }
  }

  const invite = (email: string) =>
    run(
      email,
      async () => {
        const result = await api<{ state: string }>("/admin/invitations", { method: "POST", body: { email } });
        if (result.state === "queued") return `${email} quedó en cola.`;
        if (result.state === "failed") {
          setError("No salió el correo.");
          return "";
        }
        return result.state === "sent" ? `Invitación enviada a ${email}.` : "";
      },
      "No pudimos enviar la invitación. Inténtalo de nuevo.",
    );

  const unqueue = (row: InvitationRow) =>
    run(
      row.email,
      async () => {
        await api(`/admin/invitations/${row.invitationId}/queue`, { method: "DELETE" });
        return "Quitada de la cola.";
      },
      "No pudimos quitarla de la cola. Inténtalo de nuevo.",
    );

  if (!page) {
    return load.state.status === "error" ? (
      <ErrorBanner message="No pudimos cargar las invitaciones. Inténtalo de nuevo." onRetry={load.reload} />
    ) : (
      <Skeleton rows={4} />
    );
  }

  const full = capTaken(page);
  const rows = rowsFor(page.items, filter);

  return (
    <>
      <div className="tools">
        <div className="seg" role="group" aria-label="Estado">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              aria-pressed={filter === f.id}
              onClick={() => {
                setFilter(f.id);
                setConfirming(null);
                setNotice("");
                setError("");
              }}
            >
              {f.label} {rowsFor(page.items, f.id).length}
            </button>
          ))}
        </div>
        <span className="cap">
          Hoy salieron <b>{page.sentToday} de {page.dailyCap}</b>
        </span>
      </div>

      {!page.enabled && (
        <div className="banner info" id={OFF_ID} role="status">
          El envío de invitaciones todavía no está activado. Puedes revisar las solicitudes; no sale ninguna invitación.
        </div>
      )}
      {error && <div className="banner err" role="alert">{error}</div>}
      {page.enabled && page.sentToday >= page.dailyCap && (
        <div className="banner info" role="status">
          Ya salieron las {page.dailyCap} invitaciones de hoy. Lo que agregues queda en cola y se envía solo en los días siguientes.
        </div>
      )}
      {notice && <div className="banner ok" role="status">{notice}</div>}
      {load.state.status === "error" && <ErrorBanner message="No pudimos actualizar la lista." onRetry={load.reload} />}

      {rows.length === 0 ? (
        <Empty title={EMPTY[filter][0]}>{EMPTY[filter][1].replace("{cap}", String(page.dailyCap)) || null}</Empty>
      ) : (
        <div className="card">
          <table className="inv">
            <caption className="sr">Solicitudes e invitaciones</caption>
            <thead>
              <tr>
                <th scope="col">Solicitud</th>
                <th scope="col">Escribió</th>
                <th scope="col">Estado</th>
                <th scope="col"><span className="sr">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const busy = working === row.email;
                const tag = busy ? STATE_TAG.sending : STATE_TAG[row.state];
                const action = sendAction(row.state, page.enabled, full);
                return (
                  <tr key={row.email}>
                    <td>
                      <b>{row.email}</b>
                      {row.lastMessage && <p className={open === row.email ? "msg open" : "msg"}>{row.lastMessage}</p>}
                      {row.lastMessage && row.lastMessage.length > 100 && (
                        <button className="more" aria-expanded={open === row.email} onClick={() => setOpen(open === row.email ? null : row.email)}>
                          {open === row.email ? "Ver menos" : "Ver todo"}
                        </button>
                      )}
                      {row.messages > 1 && <small>Escribió {row.messages} veces. Se muestra el último mensaje.</small>}
                    </td>
                    <td data-l="Escribió">{row.lastMessageAt ? shortDay(row.lastMessageAt) : "—"}</td>
                    <td data-l="Estado">
                      <span className={`tag ${tag.tone}`}>{tag.label}</span>
                      {!busy && stateDetail(row, page.enabled).map((line) => <small key={line}>{line}</small>)}
                    </td>
                    <td className="act">
                      {busy ? (
                        <button className="btn sm" disabled>Enviando…</button>
                      ) : action && confirming === row.email ? (
                        <div className="confirm">
                          <span>{action.question}</span>
                          <button className="btn p sm" disabled={working !== null} onClick={() => invite(row.email)}>{action.yes}</button>
                          <button className="btn sm" onClick={() => setConfirming(null)}>Cancelar</button>
                        </div>
                      ) : action ? (
                        <button
                          className={row.state === "not_invited" ? "btn p sm" : "btn sm"}
                          disabled={!page.enabled || working !== null}
                          aria-describedby={page.enabled ? undefined : OFF_ID}
                          aria-label={`${action.label}: ${row.email}`}
                          onClick={() => {
                            setConfirming(row.email);
                            setNotice("");
                            setError("");
                          }}
                        >
                          {action.label}
                        </button>
                      ) : row.state === "queued" ? (
                        <button className="btn sm" disabled={working !== null} aria-label={`Quitar de la cola: ${row.email}`} onClick={() => unqueue(row)}>
                          Quitar de la cola
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
