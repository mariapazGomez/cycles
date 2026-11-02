import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { AuthCard } from "../components/AuthCard";
import * as authApi from "../services/authApi";
import { ApiError, refreshSession } from "../services/httpClient";
import { RoleChoice } from "../components/RoleChoice";
import { PolicyCheckbox } from "../components/PolicyCheckbox";

// Solo la ven cuentas creadas por Google que aún no tienen rol asignado: eligen
// coach o atleta. Un atleta sin coach espera a que uno lo invite.
export function CompleteProfilePage() {
  const navigate = useNavigate();
  const { refreshCurrentUser } = useAuth();
  const [role, setRole] = useState<authApi.SelfRole>("coach");
  const [dataConsent, setDataConsent] = useState(false);
  const [acceptPolicy, setAcceptPolicy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => authApi.completeProfile({ role, dataConsent, acceptPolicy }),
    onSuccess: async () => {
      // El rol nuevo solo llega en un token nuevo: el actual se emitió sin rol.
      await refreshSession();
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
    if (!acceptPolicy) {
      setFormError("Confirma que tienes 18 años o más y aceptas los Términos de uso y la Política de privacidad para continuar.");
      return;
    }
    mutation.mutate();
  }

  return (
    <AuthCard title="Un último paso">
      <RoleChoice value={role} onChange={setRole} />
      {role === "athlete" && (
        <p className="auth-note">Tu coach debe invitarte con tu correo de Google para que veas tus entrenamientos.</p>
      )}

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

        <PolicyCheckbox checked={acceptPolicy} onChange={setAcceptPolicy} />

        <button type="submit" className="button-primary" disabled={mutation.isPending}>
          {mutation.isPending ? "Guardando…" : "Continuar"}
        </button>
      </form>
    </AuthCard>
  );
}
