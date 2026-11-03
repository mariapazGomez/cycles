import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { AuthCard } from "../components/AuthCard";
import { GoogleButton } from "../components/GoogleButton";
import * as authApi from "../services/authApi";
import { ApiError } from "../services/httpClient";
import { RoleChoice } from "../components/RoleChoice";
import { PolicyCheckbox } from "../components/PolicyCheckbox";
import { REGISTRATION_OPEN, clearAccessCode } from "../lib/features";
import { track } from "../lib/analytics";
import { PasswordField } from "../components/PasswordField";

// `accessCode` viene del enlace privado del piloto; con el registro abierto no hace falta.
export function RegisterPage({ accessCode }: { accessCode?: string | null }) {
  const navigate = useNavigate();
  const [role, setRole] = useState<authApi.SelfRole>("coach");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dataConsent, setDataConsent] = useState(false);
  const [acceptPolicy, setAcceptPolicy] = useState(false);
  const [phone, setPhone] = useState<"ios" | "android" | "">("");
  // El correo del Apple ID viene del de la cuenta mientras no se escriba otro.
  const [appleEmail, setAppleEmail] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (_, variables) => {
      clearAccessCode();
      track(variables.role === "athlete" ? "athlete_registered" : "coach_registered");
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

    if (!acceptPolicy) {
      setFormError("Confirma que tienes 18 años o más y aceptas los Términos de uso y la Política de privacidad para continuar.");
      return;
    }

    if (role === "athlete" && !phone) {
      setFormError("Elige qué teléfono usas: iPhone o Android.");
      return;
    }

    mutation.mutate({
      role,
      name,
      email,
      password,
      dataConsent,
      acceptPolicy,
      ...(accessCode ? { accessCode } : {}),
      ...(role === "athlete" && phone ? { phonePlatform: phone } : {}),
      ...(role === "athlete" && phone === "ios" ? { appleIdEmail: (appleEmail ?? email).trim() } : {}),
    });
  }

  return (
    <AuthCard title="Crea tu cuenta">
      {formError && <div className="error-banner">{formError}</div>}

      <RoleChoice value={role} onChange={setRole} />
      {role === "athlete" && (
        <p className="auth-note">
          Tu coach debe invitarte con este mismo correo para que veas tus entrenamientos.
        </p>
      )}

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

        <PasswordField id="password" label="Contraseña" autoComplete="new-password" minLength={8} value={password} onChange={setPassword} />

        {role === "athlete" && (
          <fieldset className="field phone-choice">
            <legend>¿Qué teléfono usas?</legend>
            <label className="checkbox-field">
              <input type="radio" name="phone" checked={phone === "ios"} onChange={() => setPhone("ios")} />
              <span>iPhone</span>
            </label>
            <label className="checkbox-field">
              <input type="radio" name="phone" checked={phone === "android"} onChange={() => setPhone("android")} />
              <span>Android</span>
            </label>
            {phone === "ios" && (
              <>
                <label htmlFor="appleEmail">Correo de tu Apple ID</label>
                <input
                  id="appleEmail"
                  type="email"
                  autoComplete="off"
                  value={appleEmail ?? email}
                  onChange={(e) => setAppleEmail(e.target.value)}
                />
                <p className="auth-note">
                  Lo usamos solo para invitarte a instalar la app con TestFlight de Apple. Puede ser distinto del
                  correo de tu cuenta de Cycles.
                </p>
              </>
            )}
            {phone === "android" && (
              <p className="auth-note">
                La app para Android aún no está en Google Play. Te enviamos un correo para que uses Cycles desde el
                navegador de tu celular.
              </p>
            )}
          </fieldset>
        )}

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

        <PolicyCheckbox checked={acceptPolicy} onChange={setAcceptPolicy} />

        <button type="submit" className="button-primary" disabled={mutation.isPending}>
          {mutation.isPending ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>

      {/* Google no puede crear cuentas nuevas mientras el registro esté cerrado. */}
      {REGISTRATION_OPEN && (
        <>
          <div className="divider">o</div>
          <GoogleButton />
        </>
      )}

      <p className="auth-footer">
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </AuthCard>
  );
}
