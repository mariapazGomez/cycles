import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

// Implementación de desarrollo: loguea el link en vez de enviar un email real.
// Proveedor real (Resend/SendGrid) pendiente, ver docs/prds/PRD-General.md
// sección 11 (decisiones abiertas). Swap this class for a real provider
// implementation behind the same public methods when one is chosen.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const url = `${this.config.get("FRONTEND_URL")}/verify-email?token=${token}`;
    this.logger.log(`[DEV] Verificación de email para ${to}: ${url}`);
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const url = `${this.config.get("FRONTEND_URL")}/reset-password?token=${token}`;
    this.logger.log(`[DEV] Recuperación de contraseña para ${to}: ${url}`);
  }

  async sendAthleteInvitationEmail(to: string, token: string): Promise<void> {
    const url = `${this.config.get("FRONTEND_URL")}/accept-invitation?token=${token}`;
    this.logger.log(`[DEV] Invitación de coach para ${to}: ${url}`);
  }
}
