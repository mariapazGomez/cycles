import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import * as accountApi from "../services/accountApi";
import { ApiError } from "../services/httpClient";

const CONFIRM_WORD = "ELIMINAR";

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "Algo salió mal. Intenta de nuevo.";
}

function downloadJson(data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "mis-datos-cycles.json";
  link.click();
  URL.revokeObjectURL(url);
}

// Mi cuenta: consentimiento de estadísticas, descarga de datos y eliminar la
// cuenta. Ver docs/prds/features/PRD-PrivacidadYTerminos.md.
export function AccountPage() {
  const { user, refreshCurrentUser, logout } = useAuth();
  const [confirmation, setConfirmation] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const consent = useMutation({
    mutationFn: accountApi.setDataConsent,
    onSuccess: async () => {
      setError(null);
      await refreshCurrentUser();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const download = useMutation({
    mutationFn: accountApi.exportMyData,
    onSuccess: (data) => {
      setError(null);
      downloadJson(data);
      setNotice("Descargamos tus datos en un archivo.");
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: () => accountApi.deleteMyAccount(confirmation),
    onSuccess: () => logout(),
    onError: (e) => setError(errorMessage(e)),
  });

  if (!user) return null;
  const isAthlete = user.role === "athlete";

  function handleDelete(event: FormEvent) {
    event.preventDefault();
    setNotice(null);
    setError(null);
    remove.mutate();
  }

  return (
    <div className="ac-page">
      <h1>Mi cuenta</h1>

      {error && <div className="error-banner">{error}</div>}
      {notice && <div className="ac-notice">{notice}</div>}

      <section className="ac-card">
        <h2>Tus datos</h2>
        <dl className="ac-list">
          <dt>Nombre</dt>
          <dd>{user.name}</dd>
          <dt>Correo</dt>
          <dd>{user.email}</dd>
        </dl>
      </section>

      <section className="ac-card">
        <h2>Estadísticas de Cycles</h2>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={Boolean(user.dataConsentAt)}
            disabled={consent.isPending}
            onChange={(event) => consent.mutate(event.target.checked)}
          />
          <span>Permito que Cycles use mis datos, sin mi nombre, para mejorar la app.</span>
        </label>
      </section>

      <section className="ac-card">
        <h2>Descargar mis datos</h2>
        <p>Un archivo con todo lo que Cycles guarda de ti.</p>
        <button type="button" className="button-secondary ac-button" disabled={download.isPending} onClick={() => download.mutate()}>
          {download.isPending ? "Preparando…" : "Descargar mis datos"}
        </button>
      </section>

      <section className="ac-card ac-danger">
        <h2>Eliminar mi cuenta</h2>
        {isAthlete ? (
          <p>
            Se borran tu cuenta y todo tu historial: series, cierres de sesión y avisos. No se puede deshacer. Los planes que tu coach creó para
            ti se quedan en su Biblioteca, sin tu nombre.
          </p>
        ) : (
          <p>
            Se borran tu Biblioteca, tus plantillas y tus datos personales, y tus atletas quedan desvinculados de ti. Ellos conservan su
            historial y podrán vincularse con otro coach. No se puede deshacer.
          </p>
        )}
        <form onSubmit={handleDelete} noValidate>
          <label className="ac-confirm">
            <span>
              Para confirmar, escribe <strong>{CONFIRM_WORD}</strong>
            </span>
            <input
              type="text"
              value={confirmation}
              autoComplete="off"
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </label>
          <button type="submit" className="ac-delete" disabled={confirmation !== CONFIRM_WORD || remove.isPending}>
            {remove.isPending ? "Eliminando…" : "Eliminar mi cuenta"}
          </button>
        </form>
      </section>
    </div>
  );
}
