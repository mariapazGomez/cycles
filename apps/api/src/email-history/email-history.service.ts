import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { emailFingerprint } from "./email-fingerprint";

const BATCH = 500;

export interface HistoryAccount {
  email: string;
  isDemo: boolean;
  createdAt: Date;
}

// Historial de correos que tuvieron cuenta (CYC-295). Apagado salvo que
// EMAIL_HISTORY_ENABLED=true y exista EMAIL_HISTORY_HMAC_KEY: mientras la
// política publicada diga que al eliminar la cuenta se borra todo, no se guarda
// nada. Las cuentas de demostración no entran. Los beneficios aún no existen:
// cuando se definan, van en una tabla aparte ligada a la huella.
@Injectable()
export class EmailHistoryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(EmailHistoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get key(): string | null {
    return this.config.get<string>("EMAIL_HISTORY_HMAC_KEY")?.trim() || null;
  }

  private get writingKey(): string | null {
    return this.config.get<string>("EMAIL_HISTORY_ENABLED")?.trim() === "true" ? this.key : null;
  }

  // Al arrancar se cargan las cuentas que faltan: las anteriores a activar el
  // historial y las que no se pudieron anotar. Es repetible y no frena el arranque.
  onApplicationBootstrap(): void {
    if (!this.writingKey) return;
    void this.backfill()
      .then((added) => this.logger.log(`Historial de correos: ${added} cuentas agregadas.`))
      .catch((err) => this.logger.error(`No se pudo cargar el historial de correos: ${errorName(err)}`));
  }

  async backfill(): Promise<number> {
    const key = this.writingKey;
    if (!key) return 0;
    let added = 0;
    let cursor: string | undefined;
    for (;;) {
      const users = await this.prisma.user.findMany({
        where: {
          isDemo: false,
          // Solo cuentas activadas: un atleta que su coach invitó y nunca aceptó
          // no se ha registrado. Las de coaches eliminados ya no tienen su correo.
          OR: [{ passwordHash: { not: null } }, { emailVerifiedAt: { not: null } }, { identities: { some: {} } }],
          NOT: { email: { endsWith: "@cycles.invalid" } },
        },
        select: { id: true, email: true, createdAt: true },
        orderBy: { id: "asc" },
        take: BATCH,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (users.length === 0) return added;
      const result = await this.prisma.registeredEmail.createMany({
        // Si dos alias caen en la misma huella, queda la fecha más antigua.
        data: [...users]
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
          .map((u) => ({ fingerprint: emailFingerprint(u.email, key), firstRegisteredAt: u.createdAt })),
        skipDuplicates: true,
      });
      added += result.count;
      cursor = users[users.length - 1].id;
    }
  }

  // Al activar una cuenta. Nunca hace fallar el registro: si algo sale mal, la
  // carga del próximo arranque la agrega.
  async recordRegistration(account: HistoryAccount): Promise<void> {
    const key = this.writingKey;
    if (!key || account.isDemo) return;
    try {
      await this.prisma.registeredEmail.createMany({
        data: [{ fingerprint: emailFingerprint(account.email, key), firstRegisteredAt: account.createdAt }],
        skipDuplicates: true,
      });
    } catch (err) {
      this.logger.error(`No se pudo anotar una cuenta en el historial de correos: ${errorName(err)}`);
    }
  }

  // Dentro de la transacción que elimina la cuenta: si no se puede anotar, no se
  // elimina, porque después ya no habría cómo saber qué correo era.
  async recordDeletion(tx: Prisma.TransactionClient, account: HistoryAccount, deletedAt = new Date()): Promise<void> {
    const key = this.writingKey;
    if (!key || account.isDemo) return;
    const fingerprint = emailFingerprint(account.email, key);
    await tx.registeredEmail.upsert({
      where: { fingerprint },
      create: { fingerprint, firstRegisteredAt: account.createdAt, lastAccountDeletedAt: deletedAt },
      update: { lastAccountDeletedAt: deletedAt },
    });
  }

  // Para «Descargar mis datos»: las dos fechas, sin la huella.
  async datesFor(email: string): Promise<{ firstRegisteredAt: Date; lastAccountDeletedAt: Date | null } | null> {
    const key = this.key;
    if (!key) return null;
    return this.prisma.registeredEmail.findUnique({
      where: { fingerprint: emailFingerprint(email, key) },
      select: { firstRegisteredAt: true, lastAccountDeletedAt: true },
    });
  }
}

// El mensaje de un error de la base puede traer datos: solo se registra su tipo.
function errorName(err: unknown): string {
  return err instanceof Error ? err.name : "error desconocido";
}
