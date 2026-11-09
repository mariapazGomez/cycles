-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('warmup', 'plyometrics', 'strength', 'mobility', 'cooldown', 'cardio', 'custom', 'superset');

-- AlterTable
ALTER TABLE "RoutineExercise" ADD COLUMN     "blockId" TEXT;

-- AlterTable
ALTER TABLE "SessionExercise" ADD COLUMN     "blockId" TEXT;

-- CreateTable
CREATE TABLE "RoutineBlock" (
    "id" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BlockType" NOT NULL,
    "color" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "RoutineBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionBlock" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BlockType" NOT NULL,
    "color" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "SessionBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoutineBlock_routineId_idx" ON "RoutineBlock"("routineId");

-- CreateIndex
CREATE INDEX "SessionBlock_sessionId_idx" ON "SessionBlock"("sessionId");

-- AddForeignKey
ALTER TABLE "RoutineBlock" ADD CONSTRAINT "RoutineBlock_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineExercise" ADD CONSTRAINT "RoutineExercise_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "RoutineBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionBlock" ADD CONSTRAINT "SessionBlock_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionExercise" ADD CONSTRAINT "SessionExercise_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "SessionBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

