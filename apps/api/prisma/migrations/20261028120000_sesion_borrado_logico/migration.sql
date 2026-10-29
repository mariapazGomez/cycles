-- Borrado lógico de sesiones (pizarra del ciclo, CYC-178). Aditiva: las
-- sesiones existentes quedan con deletedAt nulo.
ALTER TABLE "TrainingSession" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "TrainingSession_deletedAt_idx" ON "TrainingSession"("deletedAt");
