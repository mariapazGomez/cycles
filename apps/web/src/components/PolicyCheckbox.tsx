// Casilla de aceptación de los Términos de uso y la Política de privacidad. Incluye
// la declaración de tener 18 años o más (la política y los términos lo prometen).
// Es explícita: empieza sin marcar y el formulario no avanza sin ella (T-147).
// Los enlaces abren en otra pestaña para no perder lo que ya se escribió.
export function PolicyCheckbox({
  checked,
  onChange,
  extra,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  extra?: string;
}) {
  return (
    <label className="checkbox-field">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        Tengo 18 años o más y acepto los{" "}
        <a href="/terminos" target="_blank" rel="noopener noreferrer">
          Términos de uso
        </a>{" "}
        y la{" "}
        <a href="/privacidad" target="_blank" rel="noopener noreferrer">
          Política de privacidad
        </a>
        .{extra ? ` ${extra}` : ""}
      </span>
    </label>
  );
}
