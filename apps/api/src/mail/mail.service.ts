import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";
import { EmailContent, athleteInvitationEmail, passwordResetEmail, verificationEmail } from "./templates";

// El envío falló (Resend rechazó el pedido o no respondió). Quien llama
// decide qué hacer: ver docs/deploy/PLAN-Deploy.md, paso 1.5.
export class MailDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MailDeliveryError";
  }
}

// Emails transaccionales vía Resend. Sin RESEND_API_KEY queda en modo
// desarrollo: no envía nada y escribe el enlace en el log, así el entorno
// local funciona sin cuenta. Ver docs/deploy/PLAN-Deploy.md, paso 1.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>("RESEND_API_KEY");
    this.resend = apiKey ? new Resend(apiKey) : null;
    // En producción nunca se entra en modo desarrollo: los enlaces con token
    // terminarían en el log (docs/SEGURIDAD.md, S-06). validateEnv ya lo
    // exige; esto es una segunda barrera.
    if (!this.resend && this.config.get<string>("NODE_ENV") === "production") {
      throw new Error("RESEND_API_KEY es obligatoria en producción.");
    }
    if (!this.resend) {
      this.logger.warn("RESEND_API_KEY no está definida: los emails se escriben en el log en vez de enviarse.");
    }
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const url = this.link("/verify-email", token);
    await this.deliver(to, verificationEmail(url), `[DEV] Verificación de email para ${to}: ${url}`);
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const url = this.link("/reset-password", token);
    await this.deliver(to, passwordResetEmail(url), `[DEV] Recuperación de contraseña para ${to}: ${url}`);
  }

  async sendAthleteInvitationEmail(to: string, token: string, coachName: string): Promise<void> {
    const url = this.link("/accept-invitation", token);
    await this.deliver(to, athleteInvitationEmail(url, coachName), `[DEV] Invitación de ${coachName} para ${to}: ${url}`);
  }

  private link(path: string, token: string): string {
    return `${this.config.get<string>("FRONTEND_URL")}${path}?token=${encodeURIComponent(token)}`;
  }

  private async deliver(to: string, content: EmailContent, devLog: string): Promise<void> {
    if (!this.resend) {
      this.logger.log(devLog);
      return;
    }

    const replyTo = this.config.get<string>("MAIL_REPLY_TO");
    try {
      const { error } = await this.resend.emails.send({
        from: this.config.get<string>("MAIL_FROM") ?? "Cycles <hola@mail.getcycles.app>",
        to,
        subject: content.subject,
        html: content.html,
        text: content.text,
        ...(replyTo ? { replyTo } : {}),
      });
      if (error) {
        throw new MailDeliveryError(`${error.name}: ${error.message}`);
      }
    } catch (err) {
      // Nunca loguear el enlace ni el token: con una key real el log podría leerlo otra persona.
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.error(`No se pudo enviar "${content.subject}" a ${to}: ${reason}`);
      throw err instanceof MailDeliveryError ? err : new MailDeliveryError(reason);
    }
  }
}
