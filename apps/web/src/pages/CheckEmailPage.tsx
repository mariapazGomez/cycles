import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { AuthCard } from "../components/AuthCard";
import * as authApi from "../services/authApi";

export function CheckEmailPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: () => authApi.resendVerificationEmail(email),
    onSuccess: () => setSent(true),
  });

  return (
    <AuthCard title="Revisa tu email">
      <p>
        Te enviamos un link de verificación{email ? ` a ${email}` : ""}. Ábrelo para activar tu
        cuenta y poder iniciar sesión.
      </p>

      {sent && <div className="success-banner">Reenviamos el link de verificación.</div>}

      <button
        type="button"
        className="button-secondary"
        disabled={!email || mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? "Enviando…" : "Reenviar email de verificación"}
      </button>

      <p className="auth-footer">
        <Link to="/login">Volver a inicio de sesión</Link>
      </p>
    </AuthCard>
  );
}
