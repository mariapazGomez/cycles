import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { AuthCard } from "../components/AuthCard";
import { GoogleButton } from "../components/GoogleButton";
import * as authApi from "../services/authApi";
import { ApiError } from "../services/httpClient";

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dataConsent, setDataConsent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (_, variables) => {
      navigate(`/check-email?email=${encodeURIComponent(variables.email)}`);
    },
    onError: (error: unknown) => {
      setFormError(error instanceof ApiError ? error.message : "No se pudo completar el registro.");
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (password.length < 8) {
      setFormError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    mutation.mutate({ name, email, password, dataConsent });
  }

  return (
    <AuthCard title="Crea tu cuenta de coach">
      {formError && <div className="error-banner">{formError}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="name">Nombre</label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

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
          {mutation.isPending ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>

      <div className="divider">o</div>
      <GoogleButton />

      <p className="auth-footer">
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </AuthCard>
  );
}
