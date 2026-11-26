-- AlterTable
ALTER TABLE "TrainingCycle" ADD COLUMN     "teamCycleId" TEXT;

-- AlterTable
ALTER TABLE "TrainingSession" ADD COLUMN     "detachedAt" TIMESTAMP(3),
ADD COLUMN     "teamSessionId" TEXT;

-- AlterTable
ALTER TABLE "SessionExercise" ADD COLUMN     "teamSessionExerciseId" TEXT;

-- CreateTable
CREATE TABLE "TeamCycle" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objective" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "CycleStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamSession" (
    "id" TEXT NOT NULL,
    "teamCycleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "routineId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamSessionBlock" (
    "id" TEXT NOT NULL,
    "teamSessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BlockType" NOT NULL,
    "color" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "TeamSessionBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamSessionExercise" (
    "id" TEXT NOT NULL,
    "teamSessionId" TEXT NOT NULL,
    "blockId" TEXT,
    "exerciseId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "targetSets" INTEGER NOT NULL,
    "targetReps" INTEGER NOT NULL,
    "targetWeight" DOUBLE PRECISION,
    "targetPercentRm" INTEGER,
    "targetRestSeconds" INTEGER,
    "targetRir" INTEGER,
    "note" TEXT,

    CONSTRAINT "TeamSessionExercise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamCycle_teamId_idx" ON "TeamCycle"("teamId");

-- CreateIndex
CREATE INDEX "TeamSession_teamCycleId_idx" ON "TeamSession"("teamCycleId");

-- CreateIndex
CREATE INDEX "TeamSessionBlock_teamSessionId_idx" ON "TeamSessionBlock"("teamSessionId");

-- CreateIndex
CREATE INDEX "TeamSessionExercise_teamSessionId_idx" ON "TeamSessionExercise"("teamSessionId");

-- CreateIndex
CREATE INDEX "TrainingCycle_teamCycleId_idx" ON "TrainingCycle"("teamCycleId");

-- CreateIndex
CREATE INDEX "TrainingSession_teamSessionId_idx" ON "TrainingSession"("teamSessionId");

-- AddForeignKey
ALTER TABLE "TrainingCycle" ADD CONSTRAINT "TrainingCycle_teamCycleId_fkey" FOREIGN KEY ("teamCycleId") REFERENCES "TeamCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_teamSessionId_fkey" FOREIGN KEY ("teamSessionId") REFERENCES "TeamSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionExercise" ADD CONSTRAINT "SessionExercise_teamSessionExerciseId_fkey" FOREIGN KEY ("teamSessionExerciseId") REFERENCES "TeamSessionExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamCycle" ADD CONSTRAINT "TeamCycle_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSession" ADD CONSTRAINT "TeamSession_teamCycleId_fkey" FOREIGN KEY ("teamCycleId") REFERENCES "TeamCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSession" ADD CONSTRAINT "TeamSession_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSessionBlock" ADD CONSTRAINT "TeamSessionBlock_teamSessionId_fkey" FOREIGN KEY ("teamSessionId") REFERENCES "TeamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSessionExercise" ADD CONSTRAINT "TeamSessionExercise_teamSessionId_fkey" FOREIGN KEY ("teamSessionId") REFERENCES "TeamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSessionExercise" ADD CONSTRAINT "TeamSessionExercise_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "TeamSessionBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSessionExercise" ADD CONSTRAINT "TeamSessionExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Peso fijo o % del RM, no ambos (igual que en rutinas y sesiones).
ALTER TABLE "TeamSessionExercise" ADD CONSTRAINT "TeamSessionExercise_percentRm_check"
  CHECK ("targetPercentRm" IS NULL OR ("targetPercentRm" BETWEEN 1 AND 100 AND "targetWeight" IS NULL));
