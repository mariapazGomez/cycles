-- Cuentas de demostración en producción: se etiquetan para dejarlas fuera del
-- análisis y de los resúmenes. Aditiva: las cuentas existentes quedan con false.
ALTER TABLE "User" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;
