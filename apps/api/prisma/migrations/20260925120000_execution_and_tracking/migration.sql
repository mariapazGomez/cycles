-- CreateEnum
CREATE TYPE "SessionOutcome" AS ENUM ('completed', 'skipped');

-- AlterTable
ALTER TABLE "ExerciseLog" DROP COLUMN "actualSets",
DROP COLUMN "notes",
DROP COLUMN "rpe",
ADD COLUMN     "rir" INTEGER,
ADD COLUMN     "setNumber" INTEGER NOT NULL,
ADD COLUMN     "supersedesId" TEXT,
ALTER COLUMN "actualReps" SET NOT NULL;

-- AlterTable
ALTER TABLE "RoutineExercise" ADD COLUMN     "defaultRir" INTEGER;

-- AlterTable
ALTER TABLE "SessionExercise" ADD COLUMN     "targetRir" INTEGER;

-- AlterTable
ALTER TABLE "TrainingSession" ADD COLUMN     "startedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SessionFeedback" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "outcome" "SessionOutcome" NOT NULL,
    "srpe" INTEGER,
    "durationMinutes" INTEGER,
    "pain" BOOLEAN NOT NULL DEFAULT false,
    "painNotes" TEXT,
    "notes" TEXT,
    "supersedesId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadAdjustment" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "fromWeek" INTEGER NOT NULL,
    "percentChange" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "affectedCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoadAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionFeedback_supersedesId_key" ON "SessionFeedback"("supersedesId");

-- CreateIndex
CREATE INDEX "SessionFeedback_sessionId_idx" ON "SessionFeedback"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseLog_supersedesId_key" ON "ExerciseLog"("supersedesId");

-- CreateIndex
CREATE INDEX "ExerciseLog_sessionExerciseId_idx" ON "ExerciseLog"("sessionExerciseId");

-- AddForeignKey
ALTER TABLE "ExerciseLog" ADD CONSTRAINT "ExerciseLog_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "ExerciseLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionFeedback" ADD CONSTRAINT "SessionFeedback_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionFeedback" ADD CONSTRAINT "SessionFeedback_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionFeedback" ADD CONSTRAINT "SessionFeedback_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "SessionFeedback"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadAdjustment" ADD CONSTRAINT "LoadAdjustment_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadAdjustment" ADD CONSTRAINT "LoadAdjustment_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "TrainingCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadAdjustment" ADD CONSTRAINT "LoadAdjustment_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

