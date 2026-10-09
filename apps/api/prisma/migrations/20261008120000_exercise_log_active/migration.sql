-- Las series de una sesión que se reabre no se borran: quedan con active = 0
-- (1 = vigente) para analizar después el comportamiento del atleta. Las series
-- existentes quedan vigentes.
ALTER TABLE "ExerciseLog" ADD COLUMN "active" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ExerciseLog" ADD CONSTRAINT "ExerciseLog_active_check" CHECK ("active" IN (0, 1));
