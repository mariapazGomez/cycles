import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { AuthCard } from "../components/AuthCard";
import * as athletesApi from "../services/athletesApi";
import { ApiError } from "../services/httpClient";
import { PolicyCheckbox } from "../components/PolicyCheckbox";
import { track } from "../lib/analytics";
import { PasswordField } from "../components/PasswordField";
import { AppHandoff } from "../components/tour/AppHandoff";

export function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { loginWithTokens, user } = useAuth();
  const [linked, setLinked] = useState(false);
  // Cuenta nueva ya activada y con sesión: se le muestra el traspaso a la app.
  const [activated, setActivated] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptPolicy, setAcceptPolicy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Quién invita y si la persona ya tiene cuenta (entonces no se le pide contraseña).
  const preview = useQuery({
    queryKey: ["invitation", token],
    queryFn: () => athletesApi.previewInvitation(token ?? ""),
    enabled: Boolean(token),
    retry: false,
  });
  const hasAccount = preview.data?.hasAccount === true;

  const mutation = useMutation({
    mutationFn: () =>
      athletesApi.acceptInvitation({
        token: token ?? "",
        acceptPolicy,
        ...(hasAccount ? {} : { password }),
      }),
    onSuccess: async (result) => {
      track("athlete_joined");
      if (result.linked) {
        setLinked(true);
        return;
      }
      await loginWithTokens(result);
      setActivated(true);
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

    if (!hasAccount) {
      if (password.length < 8) {
        setFormError("La contraseña debe tener al menos 8 caracteres.");
        return;
      }
      if (password !== confirmPassword) {
        setFormError("Las contraseñas no coinciden.");
        return;
      }
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

  if (preview.isLoading) {
    return (
      <AuthCard title="Invitación">
        <p>Cargando…</p>
      </AuthCard>
    );
  }

  if (preview.isError) {
    return (
      <AuthCard title="Link inválido" pattern="c">
        <div className="error-banner">El link de invitación es inválido o expiró. Pídele a tu coach que te invite de nuevo.</div>
        <p className="auth-footer">
          <Link to="/login">Volver a inicio de sesión</Link>
        </p>
      </AuthCard>
    );
  }

  if (activated) {
    return (
      <AuthCard title="Tu cuenta está lista">
        <AppHandoff phonePlatform={user?.phonePlatform} email={user?.email} onBrowser={() => navigate("/", { replace: true })} />
      </AuthCard>
    );
  }

  if (linked) {
    return (
      <AuthCard title="Tu cuenta está lista">
        <p>Ya estás con {preview.data?.coachName}. Inicia sesión para ver tus entrenamientos.</p>
        <AppHandoff phonePlatform={null} email={undefined} />
        <p className="auth-footer">
          <Link to="/login">Iniciar sesión</Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={hasAccount ? "Acepta la invitación" : "Activa tu cuenta"}>
      <p>
        {hasAccount
          ? `${preview.data?.coachName} te invitó a entrenar con Cycles. Ya tienes cuenta: solo falta que aceptes.`
          : `${preview.data?.coachName} te invitó a Cycles. Define tu contraseña para empezar.`}
      </p>

      {formError && <div className="error-banner">{formError}</div>}

      <form onSubmit={handleSubmit} noValidate>
        {!hasAccount && (
          <>
            <PasswordField id="password" label="Contraseña" autoComplete="new-password" minLength={8} value={password} onChange={setPassword} />
            <PasswordField id="confirmPassword" label="Confirmar contraseña" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={setConfirmPassword} />
          </>
        )}

        <PolicyCheckbox
          checked={acceptPolicy}
          onChange={setAcceptPolicy}
          extra="Tu coach verá tus entrenamientos y lo que cuentes, incluidas las notas de dolor."
        />

        <button type="submit" className="button-primary" disabled={mutation.isPending}>
          {mutation.isPending ? "Guardando…" : hasAccount ? "Aceptar invitación" : "Activar cuenta"}
        </button>
      </form>
    </AuthCard>
  );
}
