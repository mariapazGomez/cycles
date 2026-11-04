-- CreateEnum
CREATE TYPE "EmailMode" AS ENUM ('receive', 'send', 'both');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EmailAddress" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "mode" "EmailMode" NOT NULL,
    "service" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAccessLog" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "view" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailAddress_address_key" ON "EmailAddress"("address");

-- CreateIndex
CREATE INDEX "AdminAccessLog_createdAt_idx" ON "AdminAccessLog"("createdAt");


-- Datos iniciales del directorio de correos (direcciones del producto, no personales;
-- `privacidad@` ya es pública en la política). Se editan desde el portal.
INSERT INTO "EmailAddress" ("id", "address", "purpose", "mode", "service", "updatedAt") VALUES
  (gen_random_uuid()::text, 'redes@getcycles.app', 'Redes sociales', 'receive', 'Cloudflare Email Routing', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'privacidad@getcycles.app', 'Consultas de privacidad: eliminar o exportar datos', 'receive', 'Cloudflare Email Routing', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'hola@mail.getcycles.app', 'Remitente de correos transaccionales (verificación, invitación, recuperación)', 'send', 'Resend', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'contacto@getcycles.app', 'Contacto y soporte', 'both', 'Cloudflare Email Routing', CURRENT_TIMESTAMP);
