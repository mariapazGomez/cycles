import { ExecutionContext } from "@nestjs/common";
import { ThrottlerModuleOptions } from "@nestjs/throttler";

// Límite de intentos (docs/SEGURIDAD.md, S-01). Dos contadores:
// - "default": por IP, para toda la API.
// - "email": por el email del body, para frenar que se usen los endpoints
//   que envían correos contra una misma persona. Por defecto es tan alto que
//   no afecta; cada ruta sensible lo baja con @Throttle.
// Los valores son iniciales: están aquí para ajustarlos fácil.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export const THROTTLE_MESSAGE = "Hiciste demasiados intentos. Espera unos minutos y vuelve a probar.";

export const LIMITS = {
  global: { default: { limit: 100, ttl: MINUTE } },
  login: { default: { limit: 20, ttl: MINUTE }, email: { limit: 5, ttl: MINUTE } },
  register: { default: { limit: 5, ttl: HOUR } },
  // Recuperación y reenvío: el mismo límite exista o no el email (no revela nada).
  emailLink: { default: { limit: 10, ttl: HOUR }, email: { limit: 3, ttl: HOUR } },
  invite: { default: { limit: 20, ttl: HOUR }, email: { limit: 3, ttl: HOUR } },
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
  errorMessage: THROTTLE_MESSAGE,
  // El tracker lleva IP y email; cada contador elige su parte en generateKey.
  getTracker: (req: Record<string, any>) => `${req.ip}|${emailOf(req)}`,
  generateKey: (context: ExecutionContext, tracker: string, name: string) => {
    const [ip, email] = tracker.split("|");
    const id = name === "email" && email ? `email:${email}` : `ip:${ip}`;
    return `${name}:${context.getClass().name}.${context.getHandler().name}:${id}`;
  },
};
