-- Un plan nace activo: el estado "borrador" desaparece. Los borradores
-- existentes pasan a activos, es decir, el atleta empieza a verlos.
UPDATE "TrainingCycle" SET "status" = 'active' WHERE "status" = 'draft';

ALTER TABLE "TrainingCycle" ALTER COLUMN "status" DROP DEFAULT;
ALTER TYPE "CycleStatus" RENAME TO "CycleStatus_old";
CREATE TYPE "CycleStatus" AS ENUM ('active', 'completed', 'archived');
ALTER TABLE "TrainingCycle" ALTER COLUMN "status" TYPE "CycleStatus" USING "status"::text::"CycleStatus";
ALTER TABLE "TrainingCycle" ALTER COLUMN "status" SET DEFAULT 'active';
DROP TYPE "CycleStatus_old";
