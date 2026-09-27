import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { corsOrigins } from "./common/config/env.validation";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Detrás del proxy de Render la IP real llega en X-Forwarded-For; sin esto
  // el límite de intentos vería a todos como una sola IP. En local queda en 0
  // para que nadie pueda falsear su IP con ese encabezado.
  app.set("trust proxy", Number(config.get<string>("TRUST_PROXY") ?? 0));

  // Cabeceras de seguridad (docs/SEGURIDAD.md, S-07).
  app.use(helmet());
  // Solo la web de Cycles puede llamar a la API desde el navegador (S-04).
  app.enableCors({ origin: corsOrigins(config) });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
