import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { AuthCard } from "../components/AuthCard";

export function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithTokens } = useAuth();
  const [error, setError] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");

    if (!accessToken || !refreshToken) {
      setError(true);
      return;
    }

    loginWithTokens({ accessToken, refreshToken })
      .then((user) => {
        navigate(user.role ? "/" : "/complete-profile", { replace: true });
      })
      .catch(() => setError(true));
  }, [searchParams, loginWithTokens, navigate]);

  if (error) {
    return (
      <AuthCard title="No se pudo iniciar sesión con Google">
        <div className="error-banner">Intenta de nuevo o usa email y contraseña.</div>
        <p className="auth-footer">
          <Link to="/login">Volver a inicio de sesión</Link>
        </p>
      </AuthCard>
    );
  }

  return <AuthCard title="Iniciando sesión…">Un momento…</AuthCard>;
}
