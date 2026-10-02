import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { isIP } from "net";
import type { NextFunction, Request, Response } from "express";
import { AppModule } from "./app.module";
import { corsOrigins } from "./common/config/env.validation";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Detrás del proxy de Render la IP real llega en X-Forwarded-For; sin esto
  // el límite de intentos vería a todos como una sola IP. En local queda en 0
  // para que nadie pueda falsear su IP con ese encabezado.
  app.set("trust proxy", Number(config.get<string>("TRUST_PROXY") ?? 0));

  // En Render, X-Forwarded-For no sirve para la IP real: su proxy agrega al
  // valor que manda el cliente en vez de reemplazarlo, así que cualquiera
  // podría inventar su IP y esquivar el límite de intentos. La IP confiable
  // llega en un header que pone Cloudflare (delante de Render) y que el
  // cliente no puede pisar: CLIENT_IP_HEADER=true-client-ip. Todo lo que usa
  // req.ip (límite de intentos, alertas de seguridad) toma este valor.
  const clientIpHeader = config.get<string>("CLIENT_IP_HEADER")?.trim().toLowerCase();
  if (clientIpHeader) {
    app.use((req: Request, _res: Response, next: NextFunction) => {
      const value = req.headers[clientIpHeader];
      const ip = (Array.isArray(value) ? value[0] : value)?.trim();
      if (ip && isIP(ip)) {
        Object.defineProperty(req, "ip", { value: ip, configurable: true });
      }
      next();
    });
  }

  // Cabeceras de seguridad (docs/SEGURIDAD.md, S-07).
  app.use(helmet());
  // Solo la web de Cycles puede llamar a la API desde el navegador (S-04).
  app.enableCors({ origin: corsOrigins(config) });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
