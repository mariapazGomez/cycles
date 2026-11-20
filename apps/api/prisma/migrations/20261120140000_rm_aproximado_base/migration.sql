-- Base del cálculo del RM aproximado: peso y repeticiones de la serie usada (Epley).
-- Aditiva: dos columnas nulas; las filas existentes quedan intactas.
ALTER TABLE "AthleteMax" ADD COLUMN "estimatedFromWeightKg" DOUBLE PRECISION,
ADD COLUMN "estimatedFromReps" INTEGER;

-- Solo un RM aproximado lleva la base, y la lleva completa: peso > 0 y reps 1–15.
ALTER TABLE "AthleteMax" ADD CONSTRAINT "AthleteMax_estimatedFrom_check" CHECK (
  ("estimatedFromWeightKg" IS NULL AND "estimatedFromReps" IS NULL)
  OR ("source" = 'estimated' AND "estimatedFromWeightKg" > 0 AND "estimatedFromReps" BETWEEN 1 AND 15)
);
