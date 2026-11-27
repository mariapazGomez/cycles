import { ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CoachProfile, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { answeredCount, chosen, columnsFor, nextOtherTexts, otherTextsOf, parseAnswer, readableAnswers, resumeStep } from "./answers";
import { QUESTION_IDS, questionById, QuestionId } from "./questions";

// Quién tiene preguntas pendientes: «register» si empezó al registrarse y no terminó;
// «survey» si es una cuenta anterior y la encuesta está activada.
export type PendingSurvey = "register" | "survey" | null;

export const NOT_PENDING_MESSAGE = "No tienes preguntas pendientes.";

// Perfil del coach (CYC-295). Con la encuesta apagada (sin COACH_SURVEY_ENABLED) solo
// responde quien empezó al registrarse con una invitación. Las respuestas no van a
// registros ni a la analítica.
@Injectable()
export class CoachProfileService {
  private readonly logger = new Logger(CoachProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get surveyEnabled(): boolean {
    return this.config.get<string>("COACH_SURVEY_ENABLED")?.trim() === "true";
  }

  private pendingOf(user: { role: string | null; isDemo: boolean }, profile: CoachProfile | null): PendingSurvey {
    if (user.role !== "coach" || user.isDemo || profile?.completedAt) return null;
    if (profile?.origin === "register") return "register";
    return this.surveyEnabled ? "survey" : null;
  }

  // Para `GET /users/me`. Si no se puede saber, la persona entra normal.
  async pendingFor(user: { id: string; role: string | null; isDemo: boolean }): Promise<PendingSurvey> {
    if (user.role !== "coach" || user.isDemo) return null;
    try {
      return this.pendingOf(user, await this.prisma.coachProfile.findUnique({ where: { userId: user.id } }));
    } catch (err) {
      this.logger.error(`No se pudo saber si la encuesta está pendiente: ${err instanceof Error ? err.name : "error"}`);
      return null;
    }
  }

  // Dentro de la transacción del registro con invitación: marca que sus preguntas
  // son parte del registro.
  async startAtRegistration(tx: Prisma.TransactionClient, userId: string): Promise<void> {
    await tx.coachProfile.create({ data: { userId, origin: "register" } });
  }

  // Lo respondido, para retomar donde quedó.
  async get(userId: string) {
    const { user, profile } = await this.load(this.prisma, userId);
    return this.view(user, profile);
  }

  // Guarda una pregunta. Repetir la última respuesta (por un corte de red) no falla.
  async answer(userId: string, id: QuestionId, values: string[], other?: string) {
    const keys = parseAnswer(questionById(id), values);
    const { user, profile: before } = await this.load(this.prisma, userId);
    if (before?.completedAt) {
      const same = chosen(before, id).join() === keys.join() && (otherTextsOf(before)[id] ?? "") === (nextOtherTexts({}, id, keys, other)[id] ?? "");
      if (!same) throw new ConflictException(NOT_PENDING_MESSAGE);
      return this.view(user, before);
    }
    if (!this.pendingOf(user, before)) throw new ConflictException(NOT_PENDING_MESSAGE);
    await this.prisma.coachProfile.createMany({ data: [{ userId, origin: "survey" }], skipDuplicates: true });

    const saved = await this.prisma.$transaction(async (tx) => {
      // Con la fila bloqueada, dos guardados a la vez no se pisan.
      await tx.$queryRaw`SELECT 1 FROM "CoachProfile" WHERE "userId" = ${userId} FOR UPDATE`;
      const current = await tx.coachProfile.findUniqueOrThrow({ where: { userId } });
      const updated = await tx.coachProfile.update({
        where: { userId },
        data: { ...columnsFor(id, keys), otherTexts: nextOtherTexts(otherTextsOf(current), id, keys, other) },
      });
      const done = answeredCount(updated) === QUESTION_IDS.length;
      return tx.coachProfile.update({
        where: { userId },
        data: { lastStep: resumeStep(updated), completedAt: updated.completedAt ?? (done ? new Date() : null) },
      });
    });
    return this.view(user, saved);
  }

  // Lo que admin muestra al abrir un coach; null si no corresponde mostrarlo.
  async forAdmin(user: { id: string; role: string | null; isDemo: boolean }) {
    if (user.role !== "coach" || user.isDemo) return null;
    const profile = await this.prisma.coachProfile.findUnique({ where: { userId: user.id } });
    const answered = profile ? answeredCount(profile) : 0;
    return {
      status: profile?.completedAt ? ("complete" as const) : answered > 0 ? ("partial" as const) : ("none" as const),
      completedAt: profile?.completedAt ?? null,
      answered,
      total: QUESTION_IDS.length,
      questions: profile && answered > 0 ? readableAnswers(profile) : [],
    };
  }

  private async load(db: PrismaService, userId: string) {
    const user = await db.user.findUnique({ where: { id: userId }, select: { role: true, isDemo: true, coachProfile: true } });
    if (!user) throw new NotFoundException("Usuario no encontrado");
    return { user, profile: user.coachProfile };
  }

  private view(user: { role: string | null; isDemo: boolean }, profile: CoachProfile | null) {
    return {
      pending: this.pendingOf(user, profile),
      answers: Object.fromEntries(QUESTION_IDS.map((id) => [id, profile ? chosen(profile, id) : []])) as Record<QuestionId, string[]>,
      otherTexts: profile ? otherTextsOf(profile) : {},
      lastStep: profile ? resumeStep(profile) : 0,
      completedAt: profile?.completedAt ?? null,
    };
  }
}
