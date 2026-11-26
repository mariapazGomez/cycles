import { createHmac } from "crypto";
import { normalizeEmail } from "../common/validation/normalize-email";

// Huella de un correo para el historial de cuentas (CYC-295). Se junta lo que
// llega al mismo buzón, para que un alias no sirva como «correo nuevo»:
//  - Gmail ignora los puntos y lo que va desde «+»; googlemail.com es gmail.com.
//  - En PLUS_DOMAINS se ignora solo lo que va desde «+».
// En los demás dominios no se cambia nada: «+» podría ser otro buzón y no se le
// puede quitar el beneficio a otra persona. No detecta otro buzón, «Ocultar mi
// correo» de Apple ni los alias de un dominio propio.
//
// OJO: de la huella no se recupera el correo. Cambiar estas reglas o la clave
// deja el historial ya guardado sin coincidencias.
const GMAIL_DOMAINS = ["gmail.com", "googlemail.com"];
const PLUS_DOMAINS = ["outlook.com", "hotmail.com", "live.com", "icloud.com", "me.com", "mac.com", "proton.me", "protonmail.com", "pm.me", "fastmail.com"];

export function canonicalEmail(email: string): string {
  const clean = normalizeEmail(email);
  const at = clean.lastIndexOf("@");
  if (at < 1) return clean;
  let local = clean.slice(0, at);
  let domain = clean.slice(at + 1);
  if (GMAIL_DOMAINS.includes(domain)) {
    domain = "gmail.com";
    local = stripPlus(local).replace(/\./g, "") || local;
  } else if (PLUS_DOMAINS.includes(domain)) {
    local = stripPlus(local);
  }
  return `${local}@${domain}`;
}

function stripPlus(local: string): string {
  const plus = local.indexOf("+");
  return plus > 0 ? local.slice(0, plus) : local;
}

export function emailFingerprint(email: string, key: string): string {
  return createHmac("sha256", key).update(canonicalEmail(email)).digest("hex");
}
