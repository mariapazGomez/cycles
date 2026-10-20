import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { AuthCard } from "../components/AuthCard";
import { exchangeGoogleCode } from "../services/authApi";
import { track } from "../lib/analytics";

export function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithTokens } = useAuth();
  const [error, setError] = useState(false);
  const [closed, setClosed] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (searchParams.get("error") === "registration_closed") {
      setClosed(true);
      setError(true);
      return;
    }

    const code = searchParams.get("code");
    if (!code) {
      setError(true);
      return;
    }

    exchangeGoogleCode(code)
      .then((tokens) => loginWithTokens(tokens))
      .then((user) => {
        track("login_succeeded", { method: "google" });
        navigate(user.role ? "/" : "/complete-profile", { replace: true });
      })
      .catch(() => setError(true));
  }, [searchParams, loginWithTokens, navigate]);

  if (error) {
    return (
      <AuthCard title="No se pudo iniciar sesión con Google" pattern="c">
        <div className="error-banner">
          {closed
            ? "Esta cuenta de Google todavía no tiene acceso: por ahora Cycles es solo para usuarios que ya tienen cuenta."
            : "Intenta de nuevo o usa email y contraseña."}
        </div>
        <p className="auth-footer">
          <Link to="/login">Volver a inicio de sesión</Link>
        </p>
      </AuthCard>
    );
  }

  return <AuthCard title="Iniciando sesión…" pattern="c">Un momento…</AuthCard>;
}
