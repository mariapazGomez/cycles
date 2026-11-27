// Solo atletas (CYC-194): con iPhone se invita a TestFlight al correo del Apple ID.
export function PhoneChoice({
  phone,
  onPhone,
  appleEmail,
  onAppleEmail,
}: {
  phone: "ios" | "android" | "";
  onPhone: (phone: "ios" | "android") => void;
  appleEmail: string;
  onAppleEmail: (email: string) => void;
}) {
  return (
    <fieldset className="field phone-choice">
      <legend>¿Qué teléfono usas?</legend>
      <label className="checkbox-field">
        <input type="radio" name="phone" checked={phone === "ios"} onChange={() => onPhone("ios")} />
        <span>iPhone</span>
      </label>
      <label className="checkbox-field">
        <input type="radio" name="phone" checked={phone === "android"} onChange={() => onPhone("android")} />
        <span>Android</span>
      </label>
      {phone === "ios" && (
        <>
          <label htmlFor="appleEmail">Correo de tu Apple ID</label>
          <input
            id="appleEmail"
            type="email"
            autoComplete="off"
            value={appleEmail}
            onChange={(e) => onAppleEmail(e.target.value)}
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
  );
}
