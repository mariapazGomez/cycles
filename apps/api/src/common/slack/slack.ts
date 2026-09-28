import { Logger } from "@nestjs/common";

// Envío a un incoming webhook de Slack, compartido por las alertas de
// seguridad (docs/PLAN-Seguridad.md, 1E) y los avisos de actividad
// (docs/deploy/PLAN-Deploy.md, paso 8). Nunca lanza: si Slack falla, queda
// un error en el log y devuelve false. La URL del webhook es un secreto (R1)
// y no se loguea.

const SLACK_TIMEOUT_MS = 3_000;

export async function postToSlack(webhookUrl: string, text: string, logger: Logger): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(SLACK_TIMEOUT_MS),
    });
    if (!res.ok) {
      logger.error(`Slack rechazó el mensaje (HTTP ${res.status}).`);
      return false;
    }
    return true;
  } catch (err) {
    logger.error(`No se pudo enviar el mensaje a Slack: ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

// El prefijo con el que se valida una URL de webhook al arrancar.
export const SLACK_WEBHOOK_PREFIX = "https://hooks.slack.com/";

// Oculta parte del email: "lucia@gmail.com" → "lu***@gmail.com".
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local.slice(0, 2)}***@${domain}`;
}

// Entre comillas invertidas si trae "*" (email oculto), para que Slack no lo lea como negrita.
export function slackValue(value: string | number): string {
  return String(value).includes("*") ? `\`${value}\`` : String(value);
}
