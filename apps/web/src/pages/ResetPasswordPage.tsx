import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { AuthCard } from "../components/AuthCard";
import * as authApi from "../services/authApi";
import { ApiError } from "../services/httpClient";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => authApi.confirmPasswordReset(token ?? "", newPassword),
    onError: (error: unknown) => {
      setFormError(
        error instanceof ApiError ? error.message : "No se pudo restablecer la contraseña.",
      );
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (newPassword.length < 8) {
      setFormError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError("Las contraseñas no coinciden.");
      return;
    }

    mutation.mutate();
  }

  if (!token) {
    return (
      <AuthCard title="Link inválido">
        <div className="error-banner">Este link de recuperación no es válido.</div>
        <p className="auth-footer">
          <Link to="/forgot-password">Solicitar uno nuevo</Link>
        </p>
      </AuthCard>
    );
  }

  if (mutation.isSuccess) {
    return (
      <AuthCard title="Contraseña actualizada">
        <div className="success-banner">Ya puedes iniciar sesión con tu nueva contraseña.</div>
        <Link className="button-primary" to="/login" style={{ display: "block", textAlign: "center" }}>
          Ir a iniciar sesión
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Crea una nueva contraseña">
      {formError && <div className="error-banner">{formError}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="newPassword">Nueva contraseña</label>
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
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

        <button type="submit" className="button-primary" disabled={mutation.isPending}>
          {mutation.isPending ? "Guardando…" : "Guardar nueva contraseña"}
        </button>
      </form>
    </AuthCard>
  );
}
