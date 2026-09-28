import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { maskEmail, postToSlack, slackValue } from "../common/slack/slack";
import { chileDate, chileDayLabel, chileDayRange, addDays } from "./chile-time";

// Avisos de actividad del piloto a Slack (docs/deploy/PLAN-Deploy.md, paso 8).
// Son informativos para el equipo, no alertas de seguridad (esas van por
// SecurityAlertService, a otro canal).
//
// Privacidad (8.2 y regla R7): solo nombre abreviado y email oculto. Nunca
// datos de salud ni de rendimiento (dolor, cargas, notas); el resumen diario
// solo lleva totales.
//
// Solo se envía en producción, para no mezclar datos de prueba con los del
// piloto. En desarrollo el aviso queda en el log, salvo que
// SLACK_ACTIVITY_SEND_IN_DEV=true (para probar el canal).

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// "Mariana Rojas Soto" → "Mariana R."
export function shortName(name: string): string {
  const [first, second] = name.trim().split(/\s+/);
  return second ? `${first} ${second[0].toUpperCase()}.` : first;
}

@Injectable()
export class ActivityNotifier {
  private readonly logger = new Logger(ActivityNotifier.name);
  private readonly webhookUrl: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const url = this.config.get<string>("SLACK_ACTIVITY_WEBHOOK_URL")?.trim();
    const sendHere =
      this.config.get<string>("NODE_ENV") === "production" ||
      this.config.get<string>("SLACK_ACTIVITY_SEND_IN_DEV") === "true";
    this.webhookUrl = url && sendHere ? url : undefined;
    if (!this.webhookUrl) {
      this.logger.log("Avisos de actividad solo en el log (sin webhook o fuera de producción).");
    }
  }

  // Coach nuevo: al verificar el email, o al completar el perfil si entró con Google.
  coachJoined(userId: string): void {
    this.run(async () => {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.role !== "coach") return;
      return `:wave: Nuevo coach: *${shortName(user.name)}* (${slackValue(maskEmail(user.email))})`;
    });
  }

  invitationSent(coachId: string): void {
    this.run(async () => {
      const coach = await this.prisma.user.findUniqueOrThrow({ where: { id: coachId } });
      return `:envelope: Coach *${shortName(coach.name)}* invitó a un atleta`;
    });
  }

  athleteJoined(athleteId: string, coachId: string): void {
    this.run(async () => {
      const [athlete, coach] = await Promise.all([
        this.prisma.user.findUniqueOrThrow({ where: { id: athleteId } }),
        this.prisma.user.findUniqueOrThrow({ where: { id: coachId } }),
      ]);
      return `:tada: *${shortName(athlete.name)}* aceptó la invitación de *${shortName(coach.name)}*`;
    });
  }

  // Solo el primer plan de cada coach.
  planCreated(coachId: string, plan: { name: string; startDate: Date; endDate: Date }): void {
    this.run(async () => {
      const count = await this.prisma.trainingCycle.count({ where: { coachId } });
      if (count !== 1) return;
      const coach = await this.prisma.user.findUniqueOrThrow({ where: { id: coachId } });
      const weeks = Math.max(1, Math.round((plan.endDate.getTime() - plan.startDate.getTime()) / WEEK_MS));
      return `:clipboard: *${shortName(coach.name)}* creó su primer plan: ${plan.name} (${weeks} ${weeks === 1 ? "semana" : "semanas"})`;
    });
  }

  // Solo la primera sesión completada de cada atleta (las correcciones no cuentan).
  sessionCompleted(athleteId: string): void {
    this.run(async () => {
      const count = await this.prisma.sessionFeedback.count({
        where: { athleteId, outcome: "completed", supersedesId: null },
      });
      if (count !== 1) return;
      const athlete = await this.prisma.user.findUniqueOrThrow({ where: { id: athleteId } });
      return `:muscle: *${shortName(athlete.name)}* registró su primera sesión`;
    });
  }

  // Resumen de un día completo en hora de Chile (por defecto, ayer). Se envía
  // una sola vez por día: ActivityDigest guarda los días ya enviados.
  async sendDailySummary(day: string = addDays(chileDate(), -1)): Promise<{ sent: boolean }> {
    const text = await this.dailySummaryText(day);
    if (!this.webhookUrl) {
      this.logger.log(text.replace(/\n/g, " | "));
      return { sent: false };
    }

    try {
      await this.prisma.activityDigest.create({ data: { day } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        this.logger.log(`El resumen del ${day} ya se había enviado.`);
        return { sent: false };
      }
      throw err;
    }

    if (!(await postToSlack(this.webhookUrl, text, this.logger))) {
      // Se libera el día para que el reintento del disparador pueda enviarlo.
      await this.prisma.activityDigest.delete({ where: { day } });
      throw new ServiceUnavailableException("No se pudo enviar el resumen a Slack.");
    }
    return { sent: true };
  }

  private async dailySummaryText(day: string): Promise<string> {
    const range = chileDayRange(day);
    const [coaches, invitations, athletes, plans, completed, skipped, adjustments] = await Promise.all([
      this.prisma.user.count({ where: { role: "coach", emailVerifiedAt: range } }),
      this.prisma.athleteInvitationToken.count({ where: { createdAt: range } }),
      this.prisma.athleteInvitationToken.count({ where: { usedAt: range } }),
      this.prisma.trainingCycle.count({ where: { createdAt: range } }),
      this.prisma.sessionFeedback.count({ where: { outcome: "completed", supersedesId: null, submittedAt: range } }),
      this.prisma.sessionFeedback.count({ where: { outcome: "skipped", supersedesId: null, submittedAt: range } }),
      this.prisma.loadAdjustment.count({ where: { createdAt: range } }),
    ]);
    return [
      `:bar_chart: *Resumen del ${chileDayLabel(day)}*`,
      `• Coaches nuevos: ${coaches}`,
      `• Invitaciones enviadas: ${invitations}`,
      `• Atletas nuevos: ${athletes}`,
      `• Planes creados: ${plans}`,
      `• Sesiones registradas: ${completed}`,
      `• Sesiones omitidas: ${skipped}`,
      `• Ajustes de carga aplicados: ${adjustments}`,
    ].join("\n");
  }

  // En segundo plano: un aviso nunca demora ni rompe la respuesta de la API.
  private run(build: () => Promise<string | undefined>): void {
    void build()
      .then((text) => {
        if (!text) return;
        if (this.webhookUrl) return postToSlack(this.webhookUrl, text, this.logger);
        this.logger.log(text);
      })
      .catch((err) => this.logger.error(`No se pudo armar el aviso de actividad: ${err instanceof Error ? err.message : err}`));
  }
}
