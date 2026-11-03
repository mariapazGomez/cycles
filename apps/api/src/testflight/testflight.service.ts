import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { ActivityNotifier } from "../activity/activity-notifier.service";
import { AppStoreConnectClient } from "./app-store-connect.client";

const MAX_ATTEMPTS = 10;

// Invitación automática a TestFlight para atletas que se registran con iPhone, y
// correo con el acceso web para quienes usan Android (CYC-194). Nada de esto
// bloquea el registro: lo que falla queda en BetaInvite y se reintenta.
@Injectable()
export class TestflightService {
  private readonly logger = new Logger(TestflightService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly client: AppStoreConnectClient,
    private readonly mail: MailService,
    private readonly activity: ActivityNotifier,
  ) {}

  // Al registrarse: deja anotada la invitación (iPhone). Todavía no se envía:
  // espera a que el atleta verifique su correo.
  async recordRegistration(userId: string, platform: "ios" | "android" | undefined, appleIdEmail: string | undefined): Promise<void> {
    if (!platform) return;
    await this.prisma.user.update({ where: { id: userId }, data: { phonePlatform: platform } });
    if (platform !== "ios" || !appleIdEmail) return;
    try {
      await this.prisma.betaInvite.create({ data: { userId, email: appleIdEmail.trim().toLowerCase() } });
    } catch (error) {
      // Ese correo ya tiene una invitación (otra cuenta): no se invita dos veces.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
      this.logger.log("Un Apple ID ya estaba invitado: se omite la invitación repetida.");
    }
  }

  // Al verificar el correo de Cycles: iPhone → invitación; Android → correo con el acceso web.
  onEmailVerified(userId: string): void {
    void this.handleVerified(userId).catch((err: unknown) => {
      this.logger.error(`Falló la invitación en segundo plano (${err instanceof Error ? err.name : "error"}).`);
    });
  }

  private async handleVerified(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { betaInvite: true } });
    if (!user || user.role !== "athlete" || user.isDemo) return;
    if (user.phonePlatform === "android") {
      await this.mail.sendAndroidAccessEmail(user.email);
    } else if (user.betaInvite) {
      await this.send(user.betaInvite.id);
    }
  }

  // Intenta una invitación. Sin la llave de Apple queda pendiente; si Apple falla,
  // queda `failed` con el motivo y se avisa al equipo.
  private async send(inviteId: string): Promise<"invited" | "failed" | "pending"> {
    if (!this.client.enabled) return "pending";
    const invite = await this.prisma.betaInvite.findUniqueOrThrow({ where: { id: inviteId }, include: { user: true } });
    if (invite.status === "invited" || invite.user.isDemo) return invite.status === "invited" ? "invited" : "pending";
    try {
      await this.client.addTester(invite.email, invite.user.name);
      await this.prisma.betaInvite.update({
        where: { id: invite.id },
        data: { status: "invited", invitedAt: new Date(), attempts: { increment: 1 }, lastError: null },
      });
      return "invited";
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido.";
      await this.prisma.betaInvite.update({
        where: { id: invite.id },
        data: { status: "failed", attempts: { increment: 1 }, lastError: message.slice(0, 300) },
      });
      this.activity.testflightInviteFailed(invite.userId);
      return "failed";
    }
  }

  // Reintenta las pendientes y las fallidas de quienes ya verificaron su correo.
  async retryPending(): Promise<{ enabled: boolean; invited: number; failed: number }> {
    if (!this.client.enabled) return { enabled: false, invited: 0, failed: 0 };
    const rows = await this.prisma.betaInvite.findMany({
      where: { status: { in: ["pending", "failed"] }, attempts: { lt: MAX_ATTEMPTS }, user: { emailVerifiedAt: { not: null }, isDemo: false } },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: { id: true },
    });
    let invited = 0;
    let failed = 0;
    for (const row of rows) {
      if ((await this.send(row.id)) === "invited") invited += 1;
      else failed += 1;
    }
    return { enabled: true, invited, failed };
  }
}
