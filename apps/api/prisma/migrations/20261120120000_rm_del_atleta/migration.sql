-- RM del atleta por ejercicio y carga como % del RM (CYC-306). Aditiva: una tabla, un enum y tres
-- columnas nulas; no toca ni reescribe filas existentes.
-- CreateEnum
CREATE TYPE "MaxSource" AS ENUM ('coach', 'athlete', 'estimated');

-- AlterTable
ALTER TABLE "RoutineExercise" ADD COLUMN     "defaultPercentRm" INTEGER;

-- AlterTable
ALTER TABLE "SessionExercise" ADD COLUMN     "frozenRmKg" DOUBLE PRECISION,
ADD COLUMN     "targetPercentRm" INTEGER;

-- CreateTable
CREATE TABLE "AthleteMax" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "MaxSource" NOT NULL,
    "recordedById" TEXT NOT NULL,
    "basedOnLogId" TEXT,

    CONSTRAINT "AthleteMax_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AthleteMax_athleteId_exerciseId_measuredAt_idx" ON "AthleteMax"("athleteId", "exerciseId", "measuredAt");

-- AddForeignKey
ALTER TABLE "AthleteMax" ADD CONSTRAINT "AthleteMax_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteMax" ADD CONSTRAINT "AthleteMax_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteMax" ADD CONSTRAINT "AthleteMax_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- El % del RM va de 1 a 100 y no convive con un peso fijo en el mismo ejercicio.
ALTER TABLE "RoutineExercise" ADD CONSTRAINT "RoutineExercise_percentRm_check"
  CHECK ("defaultPercentRm" IS NULL OR ("defaultPercentRm" BETWEEN 1 AND 100 AND "defaultWeight" IS NULL));
ALTER TABLE "SessionExercise" ADD CONSTRAINT "SessionExercise_percentRm_check"
  CHECK ("targetPercentRm" IS NULL OR ("targetPercentRm" BETWEEN 1 AND 100 AND "targetWeight" IS NULL));
ALTER TABLE "AthleteMax" ADD CONSTRAINT "AthleteMax_weightKg_check" CHECK ("weightKg" > 0 AND "weightKg" <= 1000);
