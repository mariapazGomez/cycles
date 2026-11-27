import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { DATA_CONSENT_VERSION } from "../auth/auth.service";
import { templateDates } from "../cycles/template-dates";
import { AppleRevocationService } from "./apple-revocation.service";
import { EmailHistoryService, HistoryAccount } from "../email-history/email-history.service";
import { normalizeEmail } from "../common/validation/normalize-email";

// Tope de semanas de una plantilla (CreateTemplateDto).
const MAX_TEMPLATE_WEEKS = 52;

export function weeksBetween(start: Date, end: Date): number {
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return Math.min(MAX_TEMPLATE_WEEKS, Math.max(1, Math.ceil(days / 7)));
}

// Eliminar la cuenta, exportar los datos y retirar el consentimiento de
// estadísticas. Ver docs/prds/features/PRD-PrivacidadYTerminos.md y la regla
// 5.1.1(v) de Apple (docs/SEGURIDAD.md).
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly appleRevocation: AppleRevocationService,
    private readonly emailHistory: EmailHistoryService,
  ) {}

  async setDataConsent(userId: string, consent: boolean): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: consent
        ? { dataConsentAt: new Date(), dataConsentVersion: DATA_CONSENT_VERSION }
        : { dataConsentAt: null, dataConsentVersion: null },
    });
  }

  async deleteAccount(userId: string, appleAuthorizationCode?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }
    await this.revokeApple(userId, appleAuthorizationCode);
    if (user.role === "athlete") {
      await this.prisma.$transaction(
        async (tx) => {
          await this.deleteSignupData(tx, userId, user);
          await this.deleteAthlete(tx, userId);
        },
        { timeout: 60_000 },
      );
    } else if (user.role === "coach") {
      await this.prisma.$transaction(
        async (tx) => {
          await this.deleteSignupData(tx, userId, user);
          await this.anonymizeCoach(tx, userId);
        },
        { timeout: 60_000 },
      );
    } else {
      throw new ForbiddenException("Esta cuenta no se puede eliminar desde la app.");
    }
  }

  // Quien entra con Apple: se revoca su autorización antes de borrar. Una falla de
  // Apple no impide eliminar la cuenta (derecho de supresión); un código de otra
  // cuenta de Apple sí detiene el borrado. Una versión antigua de la app no manda
  // código: se elimina igual y queda el aviso en el registro.
  private async revokeApple(userId: string, authorizationCode?: string): Promise<void> {
    const apple = await this.prisma.userIdentity.findFirst({ where: { userId, provider: "apple" } });
    if (!apple) {
      return;
    }
    if (!authorizationCode) {
      this.logger.warn("Cuenta con Apple eliminada sin código de autorización: no se revocó el token.");
      return;
    }
    if ((await this.appleRevocation.revoke(authorizationCode, apple.subject)) === "mismatch") {
      throw new BadRequestException("Confirma con la cuenta de Apple con la que entraste.");
    }
  }

  // Lo del registro (CYC-295), antes de perder el correo: se anota en el historial
  // y se borran su invitación y su perfil (decidido el 26-11). El perfil se borra
  // aquí porque la fila de un coach se conserva anonimizada y la cascada no se
  // activaría.
  private async deleteSignupData(tx: Prisma.TransactionClient, userId: string, account: HistoryAccount): Promise<void> {
    await this.emailHistory.recordDeletion(tx, account);
    await tx.pilotInvitation.deleteMany({ where: { OR: [{ usedByUserId: userId }, { email: normalizeEmail(account.email) }] } });
    await tx.coachProfile.deleteMany({ where: { userId } });
  }

  // Atleta: se borra todo lo suyo (series, cierres, avisos, sesión y la cuenta).
  // Sus planes no se pierden para el coach: cada uno pasa a ser una plantilla de
  // su Biblioteca, sin atleta ni fechas reales ni rutinas puestas.
  private async deleteAthlete(tx: Prisma.TransactionClient, athleteId: string): Promise<void> {
    const cycles = await tx.trainingCycle.findMany({ where: { athleteId, isTemplate: false } });

    // Un plan creado desde una plantilla ya tiene su plantilla en la Biblioteca;
    // un macrociclo es solo un contenedor y las plantillas no lo admiten.
    for (const cycle of cycles) {
      if (cycle.templateId || cycle.cycleType === "macrocycle") {
        continue;
      }
      await tx.trainingCycle.create({
        data: {
          coachId: cycle.coachId,
          name: cycle.name,
          objective: cycle.objective,
          cycleType: cycle.cycleType,
          sessionsPerWeek: cycle.sessionsPerWeek,
          isTemplate: true,
          templateWeeks: weeksBetween(cycle.startDate, cycle.endDate),
          ...templateDates(weeksBetween(cycle.startDate, cycle.endDate)),
        },
      });
    }

    // Borrar el historial de quien se va es la única excepción a «los registros
    // no se borran»: sin esto el trigger de la base lo rechaza (SEGURIDAD.md, S-12).
    // `true` = vale solo dentro de esta transacción.
    await tx.$executeRaw`SELECT set_config('cycles.allow_purge', 'on', true)`;

    const cycleIds = cycles.map((c) => c.id);
    const sessionIds = (await tx.trainingSession.findMany({ where: { cycleId: { in: cycleIds } }, select: { id: true } })).map(
      (s) => s.id,
    );
    const sessionExerciseIds = (
      await tx.sessionExercise.findMany({ where: { sessionId: { in: sessionIds } }, select: { id: true } })
    ).map((s) => s.id);

    await tx.exerciseLog.deleteMany({ where: { OR: [{ athleteId }, { sessionExerciseId: { in: sessionExerciseIds } }] } });
    // Sus RM (CYC-306) son dato suyo: se van con la cuenta.
    await tx.athleteMax.deleteMany({ where: { athleteId } });
    await tx.sessionFeedback.deleteMany({ where: { OR: [{ athleteId }, { sessionId: { in: sessionIds } }] } });
    await tx.sessionExercise.deleteMany({ where: { id: { in: sessionExerciseIds } } });
    await tx.sessionBlock.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await tx.trainingSession.deleteMany({ where: { id: { in: sessionIds } } });
    await tx.loadAdjustment.deleteMany({ where: { cycleId: { in: cycleIds } } });
    await tx.trainingCycle.updateMany({ where: { parentCycleId: { in: cycleIds } }, data: { parentCycleId: null } });
    await tx.trainingCycle.deleteMany({ where: { id: { in: cycleIds } } });

    // Sus actividades paralelas (con sus excepciones, que caen en cascada) se van con la cuenta.
    await tx.athleteEvent.deleteMany({ where: { athleteId } });
    await this.deleteLoginData(tx, athleteId);
    await tx.athleteInvitationToken.deleteMany({ where: { coachAthlete: { athleteId } } });
    // Sale de los equipos de sus coaches (CYC-309); el equipo y sus demás atletas siguen.
    await tx.teamMember.deleteMany({ where: { athleteId } });
    await tx.coachAthlete.deleteMany({ where: { athleteId } });
    await tx.user.delete({ where: { id: athleteId } });
  }

  // Coach: sus atletas conservan todo su historial (podrán vincularse a otro
  // coach), así que la fila de la cuenta se queda anonimizada porque los planes
  // y las sesiones de esos atletas apuntan a ella. Se borra su identidad, su
  // Biblioteca y sus avisos; los ejercicios propios solo se ocultan porque el
  // historial de los atletas los usa.
  private async anonymizeCoach(tx: Prisma.TransactionClient, coachId: string): Promise<void> {
    await tx.coachAthlete.updateMany({ where: { coachId }, data: { status: "inactive" } });
    await tx.athleteInvitationToken.deleteMany({ where: { coachAthlete: { coachId } } });
    // La fila del coach se queda anonimizada, así que su pizarra no se borra sola.
    await tx.coachSummaryLayout.deleteMany({ where: { coachId } });
    // Sus equipos (CYC-309) se van con su cuenta; los atletas no se tocan.
    await tx.teamMember.deleteMany({ where: { team: { coachId } } });
    await tx.team.deleteMany({ where: { coachId } });

    // Los planes de los atletas copiados de sus plantillas pierden ese vínculo.
    await tx.trainingCycle.updateMany({ where: { template: { coachId } }, data: { templateId: null } });
    await tx.trainingCycle.deleteMany({ where: { coachId, isTemplate: true } });

    const routineIds = (await tx.routine.findMany({ where: { coachId }, select: { id: true } })).map((r) => r.id);
    await tx.routineExercise.deleteMany({ where: { routineId: { in: routineIds } } });
    await tx.routineBlock.deleteMany({ where: { routineId: { in: routineIds } } });
    await tx.routine.deleteMany({ where: { id: { in: routineIds } } });
    await tx.exercise.updateMany({ where: { createdBy: coachId }, data: { isActive: false } });

    await this.deleteLoginData(tx, coachId);
    await tx.user.update({
      where: { id: coachId },
      data: {
        email: `cuenta-eliminada-${coachId}@cycles.invalid`,
        name: "Coach eliminado",
        passwordHash: null,
        emailVerifiedAt: null,
        dataConsentAt: null,
        dataConsentVersion: null,
        authProvider: "local",
      },
    });
  }

  private async deleteLoginData(tx: Prisma.TransactionClient, userId: string): Promise<void> {
    await tx.refreshToken.deleteMany({ where: { userId } });
    await tx.passwordResetToken.deleteMany({ where: { userId } });
    await tx.oAuthExchangeCode.deleteMany({ where: { userId } });
    await tx.userIdentity.deleteMany({ where: { userId } });
    await tx.emailVerificationToken.deleteMany({ where: { userId } });
    await tx.notification.deleteMany({ where: { userId } });
    await tx.policyAcceptance.deleteMany({ where: { userId } });
  }

  // Todo lo que la persona tiene en Cycles, para que pueda llevárselo.
  async exportData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        weightUnit: true,
        dataConsentAt: true,
        phonePlatform: true,
        tourStatus: true,
        tourNewsSeen: true,
        createdAt: true,
        policyAcceptances: { select: { version: true, source: true, acceptedAt: true } },
        // El correo de su Apple ID es un dato suyo (CYC-194).
        betaInvite: { select: { email: true, status: true, invitedAt: true } },
      },
    });
    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    const exportedAt = new Date().toISOString();
    // CYC-295: el estado y las fechas de su invitación (sin el enlace ni quién del
    // equipo la envió) y las fechas del historial de su correo, si las hay.
    const [pilotInvitation, emailHistory] = await Promise.all([
      this.prisma.pilotInvitation.findFirst({
        where: { OR: [{ usedByUserId: userId }, { email: normalizeEmail(user.email) }] },
        select: { status: true, createdAt: true, queuedAt: true, sentAt: true, expiresAt: true, usedAt: true },
      }),
      this.emailHistory.datesFor(user.email),
    ]);
    const signup = { pilotInvitation, emailHistory };
    if (user.role === "athlete") {
      const [plans, logs, feedback, events, maxes] = await Promise.all([
        this.prisma.trainingCycle.findMany({
          where: { athleteId: userId },
          include: {
            sessions: { include: { blocks: true, sessionExercises: { include: { exercise: { select: { name: true } } } } } },
          },
        }),
        this.prisma.exerciseLog.findMany({ where: { athleteId: userId }, orderBy: { loggedAt: "asc" } }),
        this.prisma.sessionFeedback.findMany({ where: { athleteId: userId }, orderBy: { submittedAt: "asc" } }),
        // Sus actividades paralelas completas (con las notas, que son suyas) y sus excepciones.
        this.prisma.athleteEvent.findMany({ where: { athleteId: userId }, include: { exceptions: true }, orderBy: { date: "asc" } }),
        this.prisma.athleteMax.findMany({ where: { athleteId: userId }, orderBy: { measuredAt: "asc" } }),
      ]);
      return { exportedAt, profile: user, ...signup, plans, setLogs: logs, sessionFeedback: feedback, athleteEvents: events, maxes };
    }

    const [routines, exercises, plans, summaryLayout, teamEvents, coachProfile] = await Promise.all([
      this.prisma.routine.findMany({ where: { coachId: userId }, include: { routineExercises: true, blocks: true } }),
      this.prisma.exercise.findMany({ where: { createdBy: userId } }),
      // Solo la estructura de los planes: lo que los atletas registraron es de ellos.
      this.prisma.trainingCycle.findMany({
        where: { coachId: userId },
        include: { sessions: { include: { blocks: true, sessionExercises: true } } },
      }),
      this.prisma.coachSummaryLayout.findUnique({ where: { coachId: userId }, select: { charts: true, updatedAt: true } }),
      // Los eventos que creó para sus equipos (CYC-317).
      this.prisma.teamEvent.findMany({ where: { createdById: userId }, orderBy: { date: "asc" } }),
      // Sus respuestas del registro o de la encuesta (CYC-295).
      this.prisma.coachProfile.findUnique({ where: { userId } }),
    ]);
    return { exportedAt, profile: user, ...signup, coachProfile, routines, exercises, plans, summaryLayout, teamEvents };
  }
}
