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

  for (const origin of value("CORS_ORIGINS").split(",").map((o) => o.trim()).filter(Boolean)) {
    if (!/^https?:\/\/[^/]+$/.test(origin)) {
      errors.push(`CORS_ORIGINS tiene un origen inválido: "${origin}" (formato esperado: https://dominio, sin barra final).`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuración inválida:\n- ${errors.join("\n- ")}`);
  }
  return config;
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
