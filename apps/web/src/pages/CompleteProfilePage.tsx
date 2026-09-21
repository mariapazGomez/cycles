import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { AuthCard } from "../components/AuthCard";
import * as authApi from "../services/authApi";
import { ApiError } from "../services/httpClient";

// Solo la ven cuentas creadas por Google que aún no tienen rol asignado.
// El único rol posible aquí es 'coach': los atletas se crean por invitación
// (ver PRD-General, sección 4), nunca auto-asignándose el rol.
export function CompleteProfilePage() {
  const navigate = useNavigate();
  const { refreshCurrentUser } = useAuth();
  const [dataConsent, setDataConsent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => authApi.completeProfile({ dataConsent }),
    onSuccess: async () => {
      await refreshCurrentUser();
      navigate("/", { replace: true });
    },
    onError: (error: unknown) => {
      setFormError(error instanceof ApiError ? error.message : "No se pudo completar el perfil.");
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    mutation.mutate();
  }

  return (
    <AuthCard
      title="Un último paso"
      subtitle="Tu cuenta se activará como coach. Los atletas se suman por invitación."
    >
      {formError && <div className="error-banner">{formError}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={dataConsent}
            onChange={(e) => setDataConsent(e.target.checked)}
          />
          <span>
            Acepto que mis datos de uso de la plataforma puedan usarse de forma agregada y anónima
            para mejorar el producto (opcional).
          </span>
        </label>

        <button type="submit" className="button-primary" disabled={mutation.isPending}>
          {mutation.isPending ? "Guardando…" : "Continuar"}
        </button>
      </form>
    </AuthCard>
  );
}
