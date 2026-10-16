-- Los emails se guardan recortados y en minúsculas (T-151). Si dos cuentas
-- existentes solo difieren en mayúsculas, el UPDATE falla por la restricción
-- única y la migración se detiene sin cambiar nada: hay que resolverlas a mano.
UPDATE "User" SET "email" = lower(btrim("email")) WHERE "email" <> lower(btrim("email"));

-- Respaldo a nivel de base: ningún camino de código puede volver a crear dos
-- cuentas que solo difieran en mayúsculas.
CREATE UNIQUE INDEX "User_email_lower_key" ON "User" (lower("email"));
