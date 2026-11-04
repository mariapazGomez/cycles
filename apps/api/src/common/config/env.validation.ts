import { SLACK_WEBHOOK_PREFIX } from "../slack/slack";

// Validación de variables de entorno al arrancar: si falta algo, la API no
// arranca y el error dice qué falta (nunca muestra valores). Ver
// docs/SEGURIDAD.md, hallazgo S-06, y docs/PLAN-Seguridad.md, 1B.

const ALWAYS_REQUIRED = ["DATABASE_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "FRONTEND_URL"];

// En producción, además: sin email real los enlaces con token terminarían
// en el log, y sin CORS explícito la API no sabría a qué web responder.
const PRODUCTION_REQUIRED = [
  "RESEND_API_KEY",
  "MAIL_FROM",
  "CORS_ORIGINS",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_CALLBACK_URL",
];

const MIN_SECRET_LENGTH = 64;
const MIN_ACCESS_CODE_LENGTH = 16;

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const errors: string[] = [];
  const value = (key: string) => (typeof config[key] === "string" ? (config[key] as string).trim() : "");
  const isProduction = value("NODE_ENV") === "production";

  const required = isProduction ? [...ALWAYS_REQUIRED, ...PRODUCTION_REQUIRED] : ALWAYS_REQUIRED;
  for (const key of required) {
    if (!value(key)) {
      errors.push(`Falta la variable ${key}.`);
    }
  }

  for (const key of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"]) {
    if (value(key) && value(key).length < MIN_SECRET_LENGTH) {
      errors.push(`${key} debe tener al menos ${MIN_SECRET_LENGTH} caracteres.`);
    }
  }
  if (value("JWT_ACCESS_SECRET") && value("JWT_ACCESS_SECRET") === value("JWT_REFRESH_SECRET")) {
    errors.push("JWT_ACCESS_SECRET y JWT_REFRESH_SECRET deben ser distintos.");
  }

  const trustProxy = value("TRUST_PROXY");
  if (trustProxy && !/^\d+$/.test(trustProxy)) {
    errors.push("TRUST_PROXY debe ser un número (cantidad de proxies delante de la API).");
  }

  const clientIpHeader = value("CLIENT_IP_HEADER");
  if (clientIpHeader && !/^[a-z0-9-]+$/i.test(clientIpHeader)) {
    errors.push("CLIENT_IP_HEADER debe ser el nombre de un header (por ejemplo, true-client-ip).");
  }

  for (const origin of value("CORS_ORIGINS").split(",").map((o) => o.trim()).filter(Boolean)) {
    if (!/^https?:\/\/[^/]+$/.test(origin)) {
      errors.push(`CORS_ORIGINS tiene un origen inválido: "${origin}" (formato esperado: https://dominio, sin barra final).`);
    }
  }

  // Opcionales incluso en producción: sin ellas, las alertas de seguridad y
  // los avisos de actividad quedan en el log.
  for (const key of ["SLACK_SECURITY_WEBHOOK_URL", "SLACK_ACTIVITY_WEBHOOK_URL", "SLACK_CONTACT_WEBHOOK_URL"]) {
    if (value(key) && !value(key).startsWith(SLACK_WEBHOOK_PREFIX)) {
      errors.push(`${key} debe ser una URL de webhook de Slack (${SLACK_WEBHOOK_PREFIX}…).`);
    }
  }
  // Código de acceso del piloto: permite registrarse con el registro cerrado.
  // Opcional; si se define, debe ser largo para que no se pueda adivinar.
  if (value("PILOT_ACCESS_CODE") && value("PILOT_ACCESS_CODE").length < MIN_ACCESS_CODE_LENGTH) {
    errors.push(`PILOT_ACCESS_CODE debe tener al menos ${MIN_ACCESS_CODE_LENGTH} caracteres.`);
  }
  // Protege el endpoint del resumen diario (docs/deploy/PLAN-Deploy.md, paso 8).
  if (value("ACTIVITY_CRON_SECRET") && value("ACTIVITY_CRON_SECRET").length < MIN_SECRET_LENGTH) {
    errors.push(`ACTIVITY_CRON_SECRET debe tener al menos ${MIN_SECRET_LENGTH} caracteres.`);
  }

  // Invitaciones a TestFlight (CYC-194): las cuatro juntas o ninguna; sin ellas la
  // integración está apagada y las invitaciones quedan pendientes.
  const appleKeys = ["APP_STORE_CONNECT_KEY_ID", "APP_STORE_CONNECT_ISSUER_ID", "APP_STORE_CONNECT_PRIVATE_KEY", "TESTFLIGHT_GROUP_ID"];
  const appleSet = appleKeys.filter((key) => value(key));
  if (appleSet.length > 0 && appleSet.length < appleKeys.length) {
    errors.push(`Las variables de TestFlight van todas juntas; faltan: ${appleKeys.filter((k) => !value(k)).join(", ")}.`);
  }

  // Portal del equipo (CYC-193): la API valida el token de Cloudflare Access. Las dos
  // juntas o ninguna; sin ellas todas las rutas /admin/* responden 401.
  const accessKeys = ["CF_ACCESS_TEAM_DOMAIN", "CF_ACCESS_AUD"];
  const accessSet = accessKeys.filter((key) => value(key));
  if (accessSet.length > 0 && accessSet.length < accessKeys.length) {
    errors.push(`Las variables de Cloudflare Access van juntas; faltan: ${accessKeys.filter((k) => !value(k)).join(", ")}.`);
  }
  if (value("CF_ACCESS_TEAM_DOMAIN") && !/^[a-z0-9-]+(\.[a-z0-9-]+)*\.cloudflareaccess\.com$/i.test(value("CF_ACCESS_TEAM_DOMAIN"))) {
    errors.push("CF_ACCESS_TEAM_DOMAIN debe ser el dominio del equipo, por ejemplo equipo.cloudflareaccess.com (sin https://).");
  }
  // Lectura de PostHog para la pestaña Uso: opcional; clave y proyecto van juntos.
  const posthogKeys = ["POSTHOG_PERSONAL_API_KEY", "POSTHOG_PROJECT_ID"];
  const posthogSet = posthogKeys.filter((key) => value(key));
  if (posthogSet.length > 0 && posthogSet.length < posthogKeys.length) {
    errors.push(`Las variables de lectura de PostHog van juntas; faltan: ${posthogKeys.filter((k) => !value(k)).join(", ")}.`);
  }

  if (errors.length > 0) {
    throw new Error(`Configuración inválida:\n- ${errors.join("\n- ")}`);
  }
  return config;
}

// CORS: la web manda la cookie del refresh token, así que debe permitir credenciales
// (y por eso no puede usar un comodín: solo los orígenes de la lista).
export function corsOptions(config: { get<T = string>(key: string): T | undefined }): { origin: string[]; credentials: true } {
  return { origin: corsOrigins(config), credentials: true };
}

// Orígenes a los que responde la API desde el navegador. Por defecto, solo la web.
export function corsOrigins(config: { get<T = string>(key: string): T | undefined }): string[] {
  const list = (config.get<string>("CORS_ORIGINS") ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const frontend = config.get<string>("FRONTEND_URL");
  return list.length > 0 ? list : frontend ? [frontend] : [];
}
