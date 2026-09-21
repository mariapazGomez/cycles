import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { AuthCard } from "../components/AuthCard";
import { GoogleButton } from "../components/GoogleButton";
import { ApiError } from "../services/httpClient";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setUnverifiedEmail(null);
    setIsSubmitting(true);

    try {
      const user = await login(email, password);
      navigate(user.role ? "/" : "/complete-profile", { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setUnverifiedEmail(email);
      } else if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError("No se pudo iniciar sesión.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard title="Inicia sesión" subtitle="Bienvenido de nuevo a Cycles.">
      {formError && <div className="error-banner">{formError}</div>}
      {unverifiedEmail && (
        <div className="error-banner">
          Verifica tu email antes de iniciar sesión.{" "}
          <Link to={`/check-email?email=${encodeURIComponent(unverifiedEmail)}`}>
            Reenviar link de verificación
          </Link>
        </div>
      )}

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

        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <p className="auth-footer" style={{ textAlign: "right", margin: "-8px 0 16px" }}>
          <Link to="/forgot-password">¿Olvidaste tu contraseña?</Link>
        </p>

        <button type="submit" className="button-primary" disabled={isSubmitting}>
          {isSubmitting ? "Ingresando…" : "Ingresar"}
        </button>
      </form>

      <div className="divider">o</div>
      <GoogleButton />

      <p className="auth-footer">
        ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
      </p>
    </AuthCard>
  );
}
