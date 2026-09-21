import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AuthCard } from "../components/AuthCard";
import * as authApi from "../services/authApi";

type State = "verifying" | "success" | "error";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<State>(token ? "verifying" : "error");

  useEffect(() => {
    if (!token) return;
    authApi
      .verifyEmail(token)
      .then(() => setState("success"))
      .catch(() => setState("error"));
  }, [token]);

  if (state === "verifying") {
    return <AuthCard title="Verificando tu email">Un momento…</AuthCard>;
  }

  if (state === "success") {
    return (
      <AuthCard title="Email verificado">
        <div className="success-banner">Tu cuenta quedó activada.</div>
        <Link className="button-primary" to="/login" style={{ display: "block", textAlign: "center" }}>
          Ir a iniciar sesión
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="El link no es válido">
      <div className="error-banner">El link de verificación es inválido o ya expiró.</div>
      <Link className="button-primary" to="/check-email" style={{ display: "block", textAlign: "center" }}>
        Solicitar un nuevo link
      </Link>
    </AuthCard>
  );
}
