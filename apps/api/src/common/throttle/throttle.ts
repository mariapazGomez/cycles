import { ExecutionContext } from "@nestjs/common";
import { ThrottlerLimitDetail, ThrottlerModuleOptions } from "@nestjs/throttler";

// Límite de intentos (docs/SEGURIDAD.md, S-01). Dos contadores:
// - "default": por IP, para toda la API.
// - "email": por el email del body, para frenar que se usen los endpoints
//   que envían correos contra una misma persona. Por defecto es tan alto que
//   no afecta; cada ruta sensible lo baja con @Throttle.
// Los valores son iniciales: están aquí para ajustarlos fácil.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Cuánto falta, en palabras ("1 minuto", "35 minutos", "2 horas"): redondea
// hacia arriba para no prometer de menos.
export function waitText(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
  }
  const hours = Math.ceil(minutes / 60);
  return `${hours} ${hours === 1 ? "hora" : "horas"}`;
}

// El texto del 429 dice cuánto esperar de verdad en esa ruta: el login se libera
// en un minuto y el formulario de contacto, en una hora.
export function throttleMessage(_context: ExecutionContext, detail: ThrottlerLimitDetail): string {
  const seconds = detail.isBlocked && detail.timeToBlockExpire > 0 ? detail.timeToBlockExpire : detail.timeToExpire;
  return `Hiciste demasiados intentos. Puedes volver a intentarlo en ${waitText(seconds)}.`;
}

export const LIMITS = {
  global: { default: { limit: 100, ttl: MINUTE } },
  login: { default: { limit: 20, ttl: MINUTE }, email: { limit: 5, ttl: MINUTE } },
  register: { default: { limit: 5, ttl: HOUR } },
  // Recuperación y reenvío: el mismo límite exista o no el email (no revela nada).
  emailLink: { default: { limit: 10, ttl: HOUR }, email: { limit: 3, ttl: HOUR } },
  invite: { default: { limit: 20, ttl: HOUR }, email: { limit: 3, ttl: HOUR } },
  // Formulario público de la landing. Cada petición cuenta, también las que
  // fallan al validar, así que el límite por IP deja margen a quien corrige su
  // mensaje (la web ya valida antes de enviar). Por correo: 2 al día.
  contact: { default: { limit: 10, ttl: HOUR }, email: { limit: 2, ttl: DAY } },
  refresh: { default: { limit: 30, ttl: MINUTE } },
  // Endpoints con un token de un solo uso (verificar email, aceptar invitación, confirmar reset).
  tokenUse: { default: { limit: 20, ttl: MINUTE } },
} as const;

function emailOf(req: Record<string, any>): string {
  const email = req.body?.email;
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export const throttlerOptions: ThrottlerModuleOptions = {
  throttlers: [
    { name: "default", ...LIMITS.global.default },
    { name: "email", limit: 1_000, ttl: MINUTE },
  ],
  errorMessage: throttleMessage,
  // El tracker lleva IP y email; cada contador elige su parte en generateKey.
  getTracker: (req: Record<string, any>) => `${req.ip}|${emailOf(req)}`,
  generateKey: (context: ExecutionContext, tracker: string, name: string) => {
    const [ip, email] = tracker.split("|");
    const id = name === "email" && email ? `email:${email}` : `ip:${ip}`;
    return `${name}:${context.getClass().name}.${context.getHandler().name}:${id}`;
  },
};
