import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { clientIpMiddleware } from "./common/config/client-ip";
import { corsOptions } from "./common/config/env.validation";
import { spanishValidationPipe } from "./common/validation/spanish-validation";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Detrás del proxy de Render la IP real llega en X-Forwarded-For; sin esto
  // el límite de intentos vería a todos como una sola IP. En local queda en 0
  // para que nadie pueda falsear su IP con ese encabezado.
  app.set("trust proxy", Number(config.get<string>("TRUST_PROXY") ?? 0));

  // IP real del cliente en Render (S-13): ver common/config/client-ip.ts.
  const clientIpHeader = config.get<string>("CLIENT_IP_HEADER")?.trim();
  if (clientIpHeader) {
    app.use(clientIpMiddleware(clientIpHeader));
  }

  // Cabeceras de seguridad (docs/SEGURIDAD.md, S-07).
  app.use(helmet());
  // Solo la web de Cycles puede llamar a la API desde el navegador (S-04).
  // Con credenciales: la web envía la cookie del refresh token (S-08).
  app.enableCors(corsOptions(config));
  app.useGlobalPipes(spanishValidationPipe());
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
