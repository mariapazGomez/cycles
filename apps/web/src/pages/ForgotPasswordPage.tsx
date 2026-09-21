import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { AuthCard } from "../components/AuthCard";
import * as authApi from "../services/authApi";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const mutation = useMutation({ mutationFn: authApi.requestPasswordReset });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate(email);
  }

  if (mutation.isSuccess) {
    return (
      <AuthCard title="Revisa tu email">
        <div className="success-banner">
          Si existe una cuenta con ese email, enviamos un link para restablecer tu contraseña.
        </div>
        <p className="auth-footer">
          <Link to="/login">Volver a inicio de sesión</Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="¿Olvidaste tu contraseña?"
      subtitle="Te enviaremos un link para crear una nueva."
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <button type="submit" className="button-primary" disabled={mutation.isPending}>
          {mutation.isPending ? "Enviando…" : "Enviar link de recuperación"}
        </button>
      </form>

      <p className="auth-footer">
        <Link to="/login">Volver a inicio de sesión</Link>
      </p>
    </AuthCard>
  );
}
