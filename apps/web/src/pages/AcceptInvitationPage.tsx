import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { AuthCard } from "../components/AuthCard";
import * as athletesApi from "../services/athletesApi";
import { ApiError } from "../services/httpClient";
import { PolicyCheckbox } from "../components/PolicyCheckbox";
import { track } from "../lib/analytics";

export function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { loginWithTokens } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptPolicy, setAcceptPolicy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => athletesApi.acceptInvitation({ token: token ?? "", password, acceptPolicy }),
    onSuccess: async (tokens) => {
      track("athlete_joined");
      await loginWithTokens(tokens);
      navigate("/", { replace: true });
    },
    onError: (error: unknown) => {
      setFormError(
        error instanceof ApiError ? error.message : "No se pudo activar la cuenta.",
      );
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (password.length < 8) {
      setFormError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Las contraseñas no coinciden.");
      return;
    }

    if (!acceptPolicy) {
      setFormError("Confirma que tienes 18 años o más y aceptas los Términos de uso y la Política de privacidad para continuar.");
      return;
    }

    mutation.mutate();
  }

  if (!token) {
    return (
      <AuthCard title="Link inválido" pattern="c">
        <div className="error-banner">Este link de invitación no es válido.</div>
        <p className="auth-footer">
          <Link to="/login">Volver a inicio de sesión</Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Activa tu cuenta">
      <p>Tu coach te invitó a Cycles. Define tu contraseña para empezar.</p>

      {formError && <div className="error-banner">{formError}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="confirmPassword">Confirmar contraseña</label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <PolicyCheckbox
          checked={acceptPolicy}
          onChange={setAcceptPolicy}
          extra="Tu coach verá tus entrenamientos y lo que cuentes, incluidas las notas de dolor."
        />

        <button type="submit" className="button-primary" disabled={mutation.isPending}>
          {mutation.isPending ? "Activando…" : "Activar cuenta"}
        </button>
      </form>
    </AuthCard>
  );
}
