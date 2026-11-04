import { useState } from "react";
import { api, ApiError, SessionEnded, type EmailMode, type EmailRow } from "../api";
import { useLoad } from "../useLoad";
import { Empty, ErrorBanner, Skeleton } from "../components/Bits";
import { Drawer } from "../components/Drawer";
import { modeLabel } from "../format";

const BLANK = { address: "", purpose: "", mode: "receive" as EmailMode, service: "" };

export function EmailsTab({ onSessionEnded }: { onSessionEnded: () => void }) {
  const emails = useLoad(() => api<EmailRow[]>("/admin/emails"), "emails", onSessionEnded);
  const [editing, setEditing] = useState<EmailRow | "new" | null>(null);
  const [notice, setNotice] = useState("");

  const saved = (message: string) => {
    setEditing(null);
    setNotice(message);
    emails.reload();
  };

  return (
    <>
      <div className="tools">
        <span className="spacer" />
        <button className="btn p" onClick={() => setEditing("new")}>Agregar correo</button>
      </div>
      <div className="sr" aria-live="polite">{notice}</div>
      {notice && <div className="banner ok" role="status">{notice}</div>}

      {emails.state.status === "loading" && <Skeleton rows={4} />}
      {emails.state.status === "error" && <ErrorBanner message="No pudimos cargar los correos. Inténtalo de nuevo." onRetry={emails.reload} />}
      {emails.state.status === "ok" && emails.state.data.length === 0 && <Empty title="Aún no hay correos">Agrega el primero.</Empty>}
      {emails.state.status === "ok" && emails.state.data.length > 0 && (
        <div className="card">
          <table>
            <caption>Directorio de correos</caption>
            <thead>
              <tr>
                <th scope="col">Dirección</th>
                <th scope="col">Para qué sirve</th>
                <th scope="col">Cómo funciona</th>
                <th scope="col">Servicio</th>
                <th scope="col"><span className="sr">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {emails.state.data.map((m) => (
                <tr key={m.id}>
                  <td data-l="Dirección"><b>{m.address}</b></td>
                  <td data-l="Para qué">{m.purpose}</td>
                  <td data-l="Cómo funciona"><span className="tag">{modeLabel[m.mode]}</span></td>
                  <td data-l="Servicio">{m.service}</td>
                  <td>
                    <button className="btn sm" onClick={() => { setNotice(""); setEditing(m); }} aria-label={`Editar ${m.address}`}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <EmailForm
          row={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={saved}
          onSessionEnded={onSessionEnded}
        />
      )}
    </>
  );
}

function EmailForm({
  row,
  onClose,
  onSaved,
  onSessionEnded,
}: {
  row: EmailRow | null;
  onClose: () => void;
  onSaved: (message: string) => void;
  onSessionEnded: () => void;
}) {
  const [form, setForm] = useState(row ? { address: row.address, purpose: row.purpose, mode: row.mode, service: row.service } : BLANK);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Si la sesión de Access terminó a mitad de una acción, el portal lo avisa.
  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError("");
    try {
      await action();
      onSaved(message);
    } catch (e) {
      if (e instanceof SessionEnded) {
        onSessionEnded();
        return;
      }
      setError(e instanceof ApiError ? e.message : "No pudimos guardar. Inténtalo de nuevo.");
      setBusy(false);
    }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    run(
      () => (row ? api(`/admin/emails/${row.id}`, { method: "PUT", body: form }) : api("/admin/emails", { method: "POST", body: form })),
      row ? "Cambios guardados." : "Correo agregado.",
    );
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [key]: e.target.value }),
  });

  return (
    <Drawer title={row ? "Editar correo" : "Agregar correo"} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="em-address">Dirección</label>
          <input id="em-address" className="inp" type="email" required {...field("address")} />
        </div>
        <div className="field">
          <label htmlFor="em-purpose">Para qué sirve</label>
          <input id="em-purpose" className="inp" required maxLength={300} {...field("purpose")} />
        </div>
        <div className="field">
          <label htmlFor="em-mode">Cómo funciona</label>
          <select id="em-mode" className="inp" {...field("mode")}>
            <option value="receive">{modeLabel.receive}</option>
            <option value="send">{modeLabel.send}</option>
            <option value="both">{modeLabel.both}</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="em-service">Servicio</label>
          <input id="em-service" className="inp" required maxLength={120} {...field("service")} />
        </div>
        {error && <div className="banner err" role="alert">{error}</div>}
        <div className="actions">
          <button className="btn p" type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
          {row && !confirmDelete && (
            <button className="btn danger" type="button" disabled={busy} onClick={() => setConfirmDelete(true)}>Quitar</button>
          )}
        </div>
        {row && confirmDelete && (
          <div className="banner err" role="alert">
            ¿Quitar {row.address} del directorio?
            <button className="btn danger sm" type="button" disabled={busy} onClick={() => run(() => api(`/admin/emails/${row.id}`, { method: "DELETE" }), "Correo quitado.")}>
              Sí, quitar
            </button>
            <button className="btn sm" type="button" onClick={() => setConfirmDelete(false)}>Cancelar</button>
          </div>
        )}
      </form>
    </Drawer>
  );
}
