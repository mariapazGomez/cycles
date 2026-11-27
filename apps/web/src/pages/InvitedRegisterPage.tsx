import { FormEvent, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import logo from "../assets/logo-cycles.png";
import { useAuth } from "../hooks/useAuth";
import * as authApi from "../services/authApi";
import { ApiError } from "../services/httpClient";
import { clearInvitation } from "../lib/features";
import { FINAL_STEP, progressOf } from "../lib/coachQuestions";
import { track } from "../lib/analytics";
import { AuthCard } from "../components/AuthCard";
import { LoadingScreen } from "../components/LoadingScreen";
import { PasswordField } from "../components/PasswordField";
import { PolicyCheckbox } from "../components/PolicyCheckbox";
import { RoleChoice } from "../components/RoleChoice";
import { PhoneChoice } from "../components/PhoneChoice";
import { OnboardingCard, useStepTransition } from "../components/onboarding/OnboardingCard";
import { CoachSteps } from "../components/onboarding/CoachSteps";

// El enlace vencido, usado o inválido lleva a una sola pantalla.
function GoneInvitation() {
  return (
    <AuthCard title="Esta invitación ya no sirve">
      <p>Las invitaciones duran 7 días y sirven una sola vez.</p>
      <p>
        Si ya creaste tu cuenta, <Link to="/login">inicia sesión</Link>. Si no, escríbenos a{" "}
        <a href="mailto:hola@getcycles.app">hola@getcycles.app</a> y te ayudamos.
      </p>
    </AuthCard>
  );
}

// Registro con invitación (CYC-295, docs/diseno/invitacion-onboarding/registro.md): la cuenta se crea
// en el primer paso, con el correo ya verificado y la sesión iniciada. El coach sigue con sus
// preguntas; el atleta pasa directo al final. Sin botón de Google ni «Revisa tu email».
export function InvitedRegisterPage({ token }: { token: string }) {
  const navigate = useNavigate();
  const { status, loginWithTokens, refreshCurrentUser } = useAuth();
  // Se marca antes de iniciar la sesión: a partir de ahí, estar con sesión es parte del registro.
  const creating = useRef(false);
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<authApi.SelfRole>("coach");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [dataConsent, setDataConsent] = useState(false);
  const [acceptPolicy, setAcceptPolicy] = useState(false);
  const [phone, setPhone] = useState<"ios" | "android" | "">("");
  const [appleEmail, setAppleEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  const [busy, setBusy] = useState(false);
  const transition = useStepTransition(setStep);

  const invitation = useQuery({
    queryKey: ["invitation", token],
    queryFn: () => authApi.checkInvitation(token),
    enabled: status === "unauthenticated" && step === 0,
    staleTime: Infinity,
    retry: false,
  });

  if (status === "loading") return <LoadingScreen />;
  // Con otra sesión abierta no se crea una cuenta encima.
  if (status === "authenticated" && !creating.current) return <Navigate to="/" replace />;

  const isGone = gone || (invitation.error instanceof ApiError && invitation.error.status === 410);
  if (step === 0 && isGone) {
    clearInvitation();
    return <GoneInvitation />;
  }
  if (step === 0 && invitation.isError) {
    return (
      <AuthCard title="No pudimos revisar tu invitación">
        <p role="alert">Revisa tu conexión e inténtalo de nuevo.</p>
        <button type="button" className="button-primary" onClick={() => void invitation.refetch()}>
          Reintentar
        </button>
      </AuthCard>
    );
  }
  const email = invitation.data?.email;
  if (step === 0 && !email) return <LoadingScreen />;

  async function create(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Escribe tu nombre.");
    if (password.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.");
    if (!acceptPolicy) return setError("Confirma que tienes 18 años o más y aceptas los Términos de uso y la Política de privacidad para continuar.");
    if (role === "athlete" && !phone) return setError("Elige qué teléfono usas: iPhone o Android.");
    setBusy(true);
    try {
      const account = await authApi.register({
        role,
        name: name.trim(),
        email: email!,
        password,
        dataConsent,
        acceptPolicy,
        invitationToken: token,
        ...(role === "athlete" && phone ? { phonePlatform: phone } : {}),
        ...(role === "athlete" && phone === "ios" ? { appleIdEmail: (appleEmail ?? email!).trim() } : {}),
      });
      clearInvitation();
      track(role === "athlete" ? "athlete_registered" : "coach_registered");
      creating.current = true;
      await loginWithTokens({ accessToken: account.accessToken! });
      await transition.go(role === "coach" ? 1 : FINAL_STEP, 1);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 410) setGone(true);
      else setError(cause instanceof ApiError ? cause.message : "No se pudo completar el registro.");
    } finally {
      setBusy(false);
    }
  }

  async function enter() {
    setBusy(true);
    // Si no se puede refrescar, al entrar se retoma donde quedó.
    await refreshCurrentUser().catch(() => undefined);
    navigate("/", { replace: true });
  }

  // El atleta no responde preguntas: su final no habla de ciclos.
  if (step === FINAL_STEP && role === "athlete") {
    return (
      <OnboardingCard stage={<Brand />} percent={100} step={step} transition={transition} announce="Tu cuenta está lista, 100 %">
        <div className="ob-body ob-done">
          <h1 tabIndex={-1}>Tu cuenta está lista</h1>
        </div>
        <div className="ob-foot">
          <button type="button" className="ob-next ob-full" disabled={busy} onClick={() => void enter()}>
            Entrar a Cycles
          </button>
        </div>
      </OnboardingCard>
    );
  }

  if (step > 0) return <CoachSteps step={step} transition={transition} entering={busy} onEnter={() => void enter()} />;

  return (
    <OnboardingCard stage={<Brand />} percent={progressOf(0)} step={0} transition={transition} announce="">
      <form onSubmit={create} noValidate>
        <div className="ob-body">
          <h1 tabIndex={-1}>Crea tu cuenta</h1>
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          <RoleChoice value={role} onChange={setRole} />
          {role === "athlete" && <p className="auth-note">Tu coach debe invitarte con este mismo correo para que veas tus entrenamientos.</p>}
          <div className="field">
            <label htmlFor="ob-email">Email</label>
            <input id="ob-email" type="email" autoComplete="email" value={email} readOnly className="ob-locked" />
          </div>
          <div className="ob-two">
            <div className="field">
              <label htmlFor="ob-name">Nombre</label>
              <input id="ob-name" type="text" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <PasswordField id="ob-password" label="Contraseña" autoComplete="new-password" minLength={8} value={password} onChange={setPassword} />
          </div>
          {role === "athlete" && <PhoneChoice phone={phone} onPhone={setPhone} appleEmail={appleEmail ?? email!} onAppleEmail={setAppleEmail} />}
          <label className="checkbox-field">
            <input type="checkbox" checked={dataConsent} onChange={(e) => setDataConsent(e.target.checked)} />
            <span>Acepto que mis datos de uso de la plataforma puedan usarse de forma agregada y anónima para mejorar el producto (opcional).</span>
          </label>
          <PolicyCheckbox checked={acceptPolicy} onChange={setAcceptPolicy} />
        </div>
        <div className="ob-foot">
          <button type="submit" className="ob-next ob-full" disabled={busy}>
            {busy ? "Creando cuenta…" : "Crear cuenta y seguir"}
          </button>
        </div>
      </form>
    </OnboardingCard>
  );
}

function Brand() {
  return (
    <div className="ob-stage ob-brand">
      <img src={logo} alt="Cycles" width={140} />
    </div>
  );
}
