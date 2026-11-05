import "reflect-metadata";
import { randomBytes } from "crypto";
import type { INestApplication } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import * as bcrypt from "bcrypt";
import request = require("supertest");
import type { PrismaService } from "../../src/prisma/prisma.service";

// Contraseña de todas las cuentas de prueba.
export const PASSWORD = "Prueba-e2e-123";
export const PILOT_CODE = "codigo-piloto-e2e-0123456789";
export const CRON_SECRET = "secreto-cron-e2e-0123456789abcdef-0123456789abcdef-0123456789abcdef";

// Estas pruebas BORRAN todas las tablas. Se niegan a correr contra cualquier
// base que no sea claramente local y de pruebas.
export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("Define TEST_DATABASE_URL con la URL de una base local de pruebas (ver docs/PRUEBAS-E2E.md).");
  }
  const parsed = new URL(url);
  const database = parsed.pathname.replace(/^\//, "");
  const localHost = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsed.hostname);
  if (!localHost || !/_test$/.test(database)) {
    throw new Error(
      `TEST_DATABASE_URL debe apuntar a localhost y a una base cuyo nombre termine en «_test» (recibido: host «${parsed.hostname}», base «${database}»).`,
    );
  }
  return url;
}

function configureEnv(): void {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = testDatabaseUrl();
  process.env.JWT_ACCESS_SECRET = randomBytes(40).toString("hex");
  process.env.JWT_REFRESH_SECRET = randomBytes(40).toString("hex");
  process.env.FRONTEND_URL = "http://localhost:5173";
  process.env.PILOT_ACCESS_CODE = PILOT_CODE;
  process.env.ACTIVITY_CRON_SECRET = CRON_SECRET;
  delete process.env.REGISTRATION_OPEN;
  delete process.env.CLIENT_IP_HEADER;
  delete process.env.RESEND_API_KEY;
  delete process.env.SLACK_WEBHOOK_URL;
  delete process.env.SLACK_CONTACT_WEBHOOK_URL;
}

export interface TestApp {
  app: INestApplication;
  prisma: PrismaService;
  // Un pedido con una IP distinta cada vez, para que el límite de intentos no
  // se mezcle con lo que se prueba (el límite tiene sus propias pruebas).
  http: (method: "get" | "post" | "put" | "patch" | "delete" | "options", path: string, token?: string) => request.Test;
  close: () => Promise<void>;
}

import type { TestingModuleBuilder } from "@nestjs/testing";

export interface StartOptions {
  // Para reemplazar proveedores (por ejemplo, las claves de Cloudflare Access).
  configure?: (builder: TestingModuleBuilder) => TestingModuleBuilder;
  // Usa la misma lógica de IP real que producción (header `True-Client-IP`, S-13)
  // en vez de una IP distinta por pedido. Para probar el límite de intentos.
  realClientIp?: boolean;
}

export async function startApp(options: StartOptions = {}): Promise<TestApp> {
  configureEnv();
  if (options.realClientIp) process.env.CLIENT_IP_HEADER = "true-client-ip";
  // Se importa después de fijar el entorno: la validación lee process.env al cargar.
  const { AppModule } = await import("../../src/app.module");
  const { spanishValidationPipe } = await import("../../src/common/validation/spanish-validation");
  const { corsOptions } = await import("../../src/common/config/env.validation");
  const { PrismaService: Prisma } = await import("../../src/prisma/prisma.service");

  const builder = Test.createTestingModule({ imports: [AppModule] });
  const moduleRef = await (options.configure ? options.configure(builder) : builder).compile();
  const app = moduleRef.createNestApplication();
  if (options.realClientIp) {
    // Igual que main.ts: confiar solo en True-Client-IP, no en X-Forwarded-For.
    const { clientIpMiddleware } = await import("../../src/common/config/client-ip");
    app.use(clientIpMiddleware("true-client-ip"));
  } else {
    // Una IP distinta por pedido, en un header de prueba (ver `http`).
    app.use((req: Request, _res: Response, next: NextFunction) => {
      const ip = req.headers["x-test-ip"];
      if (typeof ip === "string") {
        Object.defineProperty(req, "ip", { value: ip, configurable: true });
      }
      next();
    });
  }
  app.useGlobalPipes(spanishValidationPipe());
  // Igual que main.ts: CORS con credenciales para la cookie del refresh token.
  app.enableCors(corsOptions(app.get(ConfigService)));
  await app.init();

  const prisma = app.get(Prisma);
  let counter = 0;
  const http: TestApp["http"] = (method, path, token) => {
    counter += 1;
    const req = request(app.getHttpServer())[method](path).set("x-test-ip", `10.${(counter >> 16) & 255}.${(counter >> 8) & 255}.${counter & 255}`);
    return token ? req.set("Authorization", `Bearer ${token}`) : req;
  };

  return { app, prisma, http, close: () => app.close() };
}

// Vacía todas las tablas de la base de pruebas.
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map((t: { tablename: string }) => `"${t.tablename}"`).join(", ");
  // ExerciseLog y SessionFeedback no se vacían sin declarar la excepción, y esta
  // solo vale dentro de la transacción (S-12).
  await prisma.$transaction([
    prisma.$executeRaw`SELECT set_config('cycles.allow_purge', 'on', true)`,
    prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`),
  ]);
}

export async function passwordHash(): Promise<string> {
  // Costo bajo: solo para que las pruebas sean rápidas.
  return bcrypt.hash(PASSWORD, 4);
}
