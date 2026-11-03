-- CYC-191: estado de la guía de primer uso, uno por cuenta (web y móvil lo comparten).
-- Aditiva: la columna nueva queda en «pending» para todas las cuentas existentes.
CREATE TYPE "TourStatus" AS ENUM ('pending', 'skipped', 'completed');

ALTER TABLE "User" ADD COLUMN "tourStatus" "TourStatus" NOT NULL DEFAULT 'pending';
