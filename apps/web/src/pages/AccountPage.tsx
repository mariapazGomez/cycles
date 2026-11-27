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
      <h1 className="page-title">Mi cuenta</h1>

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
        {/* Textos aprobados (docs/diseno/invitacion-onboarding/eliminar-cuenta.md). Cada frase describe lo
            que hace account.service: si cambia el borrado, cambian aquí. El párrafo de la huella del correo se
            agrega solo cuando el historial esté encendido y /privacidad lo diga. */}
        {isAthlete ? (
          <>
            <p>
              Se eliminan tu cuenta, tus entrenamientos registrados, tus RM, tus actividades fuera del plan, tus avisos y los avisos de tus coaches
              que te nombran. No se puede deshacer.
            </p>
            <p>
              De los planes que tu coach creó para ti, puede quedarle una plantilla con un nombre genérico, sin objetivo ni vínculo con tu cuenta. Lo
              que ya tenía guardado en su Biblioteca no cambia.
            </p>
          </>
        ) : (
          <>
            <p>
              Se eliminan tu acceso, tus equipos con sus eventos, tus rutinas, tus plantillas, tus avisos y los avisos de tus atletas sobre los planes
              que les hiciste. Tu nombre y tu correo se quitan de la cuenta, y se elimina tu perfil de coach. No se puede deshacer.
            </p>
            <p>
              Tus atletas quedan desvinculados de ti y conservan sus planes y su historial, donde apareces como «Coach eliminado». También se conserva
              lo que escribiste en esos planes.
            </p>
            <p>
              Se borran los ejercicios que creaste y que nada usa. Los demás dejan de mostrarse y se conservan con su nombre, descripción, video,
              músculos e implementos.
            </p>
            <p>De tu cuenta quedan algunos datos sin tu nombre ni tu correo, como las fechas de creación y de último ingreso y la unidad de peso.</p>
          </>
        )}
        <p>
          Las copias de respaldo se eliminan en un máximo de 90 días. Más en la <a href="/privacidad">política de privacidad</a>.
        </p>
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
