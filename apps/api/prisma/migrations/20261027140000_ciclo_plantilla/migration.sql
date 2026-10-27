-- Ciclos plantilla (Biblioteca del coach): un ciclo sin atleta que se asigna
-- después copiándolo. athleteId pasa a ser opcional y se suma templateWeeks.
-- La clave foránea conserva ON DELETE RESTRICT.
-- Antes de aplicarla en producción: respaldo (docs/deploy/PLAN-Deploy.md).
ALTER TABLE "TrainingCycle" ALTER COLUMN "athleteId" DROP NOT NULL;
ALTER TABLE "TrainingCycle" ADD COLUMN "templateWeeks" INTEGER;
