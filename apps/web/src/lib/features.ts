// Early adopters: el registro está cerrado salvo que VITE_REGISTRATION_OPEN=true
// (junto con REGISTRATION_OPEN=true en la API, que es la que lo hace cumplir).
export const REGISTRATION_OPEN = import.meta.env.VITE_REGISTRATION_OPEN === "true";

// Código de acceso del piloto: con el registro cerrado, un enlace privado
// (/register?codigo=…) deja crear la cuenta. El código se guarda mientras dura la
// pestaña para que recargar el formulario no lo pierda, y se quita de la barra
// de direcciones apenas se lee.
export const ACCESS_CODE_PARAM = "codigo";
const ACCESS_CODE_KEY = "cycles.accessCode";

export function loadAccessCode(): string | null {
  try {
    return sessionStorage.getItem(ACCESS_CODE_KEY);
  } catch {
    return null;
  }
}

export function storeAccessCode(code: string): void {
  try {
    sessionStorage.setItem(ACCESS_CODE_KEY, code);
  } catch {
    // Sin almacenamiento el código solo vive en esta carga de la página.
  }
}

export function clearAccessCode(): void {
  try {
    sessionStorage.removeItem(ACCESS_CODE_KEY);
  } catch {
    // Nada que limpiar.
  }
}

// Invitación personal (/register?invitacion=…, CYC-295): como el código, se quita de la barra de
// direcciones apenas se lee y se guarda solo mientras dure la pestaña.
export const INVITATION_PARAM = "invitacion";
const INVITATION_KEY = "cycles.invitation";

export function loadInvitation(): string | null {
  try {
    return sessionStorage.getItem(INVITATION_KEY);
  } catch {
    return null;
  }
}

export function storeInvitation(token: string): void {
  try {
    sessionStorage.setItem(INVITATION_KEY, token);
  } catch {
    // Sin almacenamiento el enlace solo vive en esta carga de la página.
  }
}

export function clearInvitation(): void {
  try {
    sessionStorage.removeItem(INVITATION_KEY);
  } catch {
    // Nada que limpiar.
  }
}
