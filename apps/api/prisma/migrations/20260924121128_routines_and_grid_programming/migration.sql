-- CreateEnum
CREATE TYPE "CycleType" AS ENUM ('microcycle', 'mesocycle', 'macrocycle');

-- AlterTable
ALTER TABLE "TrainingCycle" ADD COLUMN     "cycleType" "CycleType" NOT NULL DEFAULT 'mesocycle',
ADD COLUMN     "parentCycleId" TEXT,
ADD COLUMN     "sessionsPerWeek" INTEGER;

-- AlterTable
ALTER TABLE "TrainingSession" DROP COLUMN "orderIndex",
ADD COLUMN     "routineId" TEXT,
ADD COLUMN     "slotNumber" INTEGER NOT NULL,
ADD COLUMN     "weekNumber" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Routine" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Routine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineExercise" (
    "id" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "defaultSets" INTEGER NOT NULL,
    "defaultReps" INTEGER NOT NULL,
    "defaultWeight" DOUBLE PRECISION,
    "defaultRestSeconds" INTEGER,

    CONSTRAINT "RoutineExercise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrainingSession_cycleId_weekNumber_slotNumber_key" ON "TrainingSession"("cycleId", "weekNumber", "slotNumber");

-- AddForeignKey
ALTER TABLE "TrainingCycle" ADD CONSTRAINT "TrainingCycle_parentCycleId_fkey" FOREIGN KEY ("parentCycleId") REFERENCES "TrainingCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Routine" ADD CONSTRAINT "Routine_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineExercise" ADD CONSTRAINT "RoutineExercise_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineExercise" ADD CONSTRAINT "RoutineExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

