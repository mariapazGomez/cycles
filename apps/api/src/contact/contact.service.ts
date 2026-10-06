import { BadRequestException, HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { postToSlack } from "../common/slack/slack";
import { CreateContactDto } from "./dto/create-contact.dto";

// Formulario de contacto de la landing (docs/brand/landing.md). Lo puede usar
// cualquiera sin sesión, así que antes de guardar nada se filtra:
//
//  1. Señuelo lleno o formulario enviado demasiado rápido: es un bot. Se
//     responde igual que a una persona (201) y no se guarda ni se avisa, para
//     que no sepa que fue detectado.
//  2. Más de MAX_LINKS enlaces: el spam casi siempre los trae.
//  3. El mismo correo dentro de las últimas 24 horas: se ignora en silencio.
//  4. Tope de MAX_PER_DAY mensajes por día en total: protege la tabla y el
//     canal de Slack aunque el atacante use muchas IP.
//
// Además, el controlador limita por IP y por correo (LIMITS.contact). La IP
// no se guarda. Mensajes y correos van a Slack escapados (R6, R10).

const MIN_FILL_MS = 3_000;
const MAX_LINKS = 2;
const MAX_PER_DAY = 40;
const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_MESSAGE_LENGTH = 10;

const DAILY_CAP_MESSAGE = "Hoy recibimos muchos mensajes. Vuelve a intentarlo mañana.";

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);
  private readonly webhookUrl: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const url = this.config.get<string>("SLACK_CONTACT_WEBHOOK_URL")?.trim();
    const sendHere =
      this.config.get<string>("NODE_ENV") === "production" ||
      this.config.get<string>("SLACK_CONTACT_SEND_IN_DEV") === "true";
    this.webhookUrl = url && sendHere ? url : undefined;
    if (!this.webhookUrl) {
      this.logger.log("Mensajes de contacto solo en la base de datos (sin webhook o fuera de producción).");
    }
  }

  async create(dto: CreateContactDto): Promise<{ ok: true }> {
    if (dto.website || dto.elapsedMs === undefined || dto.elapsedMs < MIN_FILL_MS) {
      this.logger.warn("Contacto descartado por parecer un bot.");
      return { ok: true };
    }

    const email = dto.email.trim().toLowerCase();
    const message = cleanMessage(dto.message);
    if (message.length < MIN_MESSAGE_LENGTH) {
      throw new BadRequestException("Cuéntanos un poco más sobre ti");
    }
    if (countLinks(message) > MAX_LINKS) {
      throw new BadRequestException(`El mensaje puede tener hasta ${MAX_LINKS} enlaces.`);
    }

    const since = new Date(Date.now() - DAY_MS);
    const repeated = await this.prisma.contactRequest.findFirst({ where: { email, createdAt: { gte: since } } });
    if (repeated) return { ok: true };

    if ((await this.prisma.contactRequest.count({ where: { createdAt: { gte: since } } })) >= MAX_PER_DAY) {
      this.logger.warn("Se alcanzó el tope diario de mensajes de contacto.");
      throw new HttpException(DAILY_CAP_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
    }

    const saved = await this.prisma.contactRequest.create({ data: { email, message } });
    void this.notify(saved.id, email, message);
    return { ok: true };
  }

  // Nunca falla hacia la persona: el mensaje ya quedó guardado.
  private async notify(id: string, email: string, message: string): Promise<void> {
    const text = slackText(email, message);
    if (!this.webhookUrl) {
      this.logger.log(text.replace(/\n/g, " | "));
      return;
    }
    if (await postToSlack(this.webhookUrl, text, this.logger)) {
      await this.prisma.contactRequest
        .update({ where: { id }, data: { slackSentAt: new Date() } })
        .catch((err) => this.logger.error(`No se pudo marcar el aviso a Slack: ${err instanceof Error ? err.message : err}`));
    }
  }
}

// Quita caracteres de control (salvo saltos de línea), junta espacios y limita
// los saltos de línea seguidos.
export function cleanMessage(raw: string): string {
  return raw
    .replace(/[^\S\n]+/g, " ")
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function countLinks(text: string): number {
  return (text.match(/(https?:\/\/|www\.)\S+/gi) ?? []).length;
}

// Slack lee <...> como menciones y enlaces (<!channel>, <@U123>, <https://…|texto>):
// se escapan &, < y > para que el texto de un desconocido no active nada.
export function escapeSlack(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function slackText(email: string, message: string): string {
  const quoted = escapeSlack(message)
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
  return `:speech_balloon: *Nuevo contacto desde la landing*\n*Correo:* ${escapeSlack(email)}\n*Quién es:*\n${quoted}`;
}
