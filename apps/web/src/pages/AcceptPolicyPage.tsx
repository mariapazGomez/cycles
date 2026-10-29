import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { AuthCard } from "../components/AuthCard";
import { PolicyCheckbox } from "../components/PolicyCheckbox";
import * as authApi from "../services/authApi";
import { ApiError } from "../services/httpClient";

// Para quien ya tenía cuenta cuando se empezó a guardar la aceptación de los
// Términos de uso y la Política de privacidad (T-147), o cuando cambia la
// versión: no sigue hasta aceptar la vigente.
export function AcceptPolicyPage() {
  const navigate = useNavigate();
  const { user, refreshCurrentUser, logout } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: authApi.acceptPolicy,
    onSuccess: async () => {
      await refreshCurrentUser();
      navigate("/", { replace: true });
    },
    onError: (error: unknown) => {
      setFormError(error instanceof ApiError ? error.message : "No se pudo guardar tu aceptación. Intenta de nuevo.");
    },
  });

  if (user && !user.needsPolicyAcceptance) return <Navigate to="/" replace />;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!accepted) {
      setFormError("Confirma que tienes 18 años o más y aceptas los Términos de uso y la Política de privacidad para continuar.");
      return;
    }
    mutation.mutate();
  }

  return (
    <AuthCard title="Antes de seguir">
      <p>
        Para usar Cycles necesitamos que aceptes los Términos de uso y la Política de privacidad
        {user?.policyVersion ? ` (versión ${user.policyVersion})` : ""}. Léelos con calma: explican cómo cuidamos tus datos.
      </p>

      {formError && <div className="error-banner">{formError}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <PolicyCheckbox
          checked={accepted}
          onChange={setAccepted}
          extra={
            user?.role === "athlete"
              ? "Tu coach verá tus entrenamientos y lo que cuentes, incluidas las notas de dolor."
              : undefined
          }
        />

        <button type="submit" className="button-primary" disabled={mutation.isPending}>
          {mutation.isPending ? "Guardando…" : "Aceptar y continuar"}
        </button>
      </form>

      <p className="auth-footer">
        <button type="button" className="link-button" onClick={() => void logout()}>
          Cerrar sesión
        </button>
      </p>
    </AuthCard>
  );
}
