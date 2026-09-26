// Plantillas de los emails transaccionales. HTML simple con estilos en línea
// (los clientes de correo ignoran <style> y CSS moderno) y una versión de
// texto plano. Textos en español latino con "tú". Ver
// docs/deploy/PLAN-Deploy.md, paso 1.4.

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

const BRAND_BLUE = "#1a66dd";
const INK = "#1f2228";
const MUTED = "#5c6068";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout({ heading, body, cta, url, note }: { heading: string; body: string; cta: string; url: string; note: string }): string {
  const safeUrl = escapeHtml(url);
  return `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#f6f7f9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #dfe2e7;border-radius:12px;">
<tr><td style="padding:32px 32px 0;font-family:Helvetica,Arial,sans-serif;font-size:22px;font-weight:700;color:${INK};">Cycles</td></tr>
<tr><td style="padding:24px 32px 0;font-family:Helvetica,Arial,sans-serif;">
<h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:${INK};">${heading}</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:${INK};">${body}</p>
<a href="${safeUrl}" style="display:inline-block;padding:12px 24px;border-radius:999px;background:${BRAND_BLUE};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">${cta}</a>
<p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:${MUTED};">Si el botón no funciona, copia este enlace en tu navegador:<br><a href="${safeUrl}" style="color:${BRAND_BLUE};word-break:break-all;">${safeUrl}</a></p>
<p style="margin:16px 0 32px;font-size:13px;line-height:1.5;color:${MUTED};">${note}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function verificationEmail(url: string): EmailContent {
  return {
    subject: "Confirma tu email para entrar a Cycles",
    html: layout({
      heading: "Confirma tu email",
      body: "Toca el botón para confirmar tu email y empezar a usar Cycles.",
      cta: "Confirmar email",
      url,
      note: "El enlace vence en 24 horas. Si no creaste una cuenta en Cycles, ignora este mensaje.",
    }),
    text: `Confirma tu email para entrar a Cycles:\n\n${url}\n\nEl enlace vence en 24 horas. Si no creaste una cuenta en Cycles, ignora este mensaje.`,
  };
}

export function passwordResetEmail(url: string): EmailContent {
  return {
    subject: "Cambia tu contraseña de Cycles",
    html: layout({
      heading: "Elige una nueva contraseña",
      body: "Recibimos un pedido para cambiar la contraseña de tu cuenta. Toca el botón para elegir una nueva.",
      cta: "Elegir nueva contraseña",
      url,
      note: "El enlace vence en 30 minutos. Si no pediste este cambio, ignora este mensaje: tu contraseña sigue igual.",
    }),
    text: `Elige una nueva contraseña para tu cuenta de Cycles:\n\n${url}\n\nEl enlace vence en 30 minutos. Si no pediste este cambio, ignora este mensaje: tu contraseña sigue igual.`,
  };
}

export function athleteInvitationEmail(url: string, coachName: string): EmailContent {
  const coach = escapeHtml(coachName);
  return {
    subject: `${coachName} te invitó a entrenar en Cycles`,
    html: layout({
      heading: `${coach} te invitó a Cycles`,
      body: `${coach} va a planificar tus entrenamientos en Cycles. Crea tu cuenta para ver tu plan y registrar cada sesión desde el celular.`,
      cta: "Crear mi cuenta",
      url,
      note: "La invitación vence en 7 días. Si no conoces a quien te invitó, ignora este mensaje.",
    }),
    text: `${coachName} te invitó a entrenar en Cycles. Crea tu cuenta para ver tu plan y registrar cada sesión:\n\n${url}\n\nLa invitación vence en 7 días. Si no conoces a quien te invitó, ignora este mensaje.`,
  };
}
