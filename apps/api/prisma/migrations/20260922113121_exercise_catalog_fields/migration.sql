/*
  Warnings:

  - The `muscleGroup` column on the `Exercise` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "MuscleGroup" AS ENUM ('chest', 'back', 'legs', 'glutes', 'shoulders', 'arms', 'core', 'cardio', 'other');

-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
DROP COLUMN "muscleGroup",
ADD COLUMN     "muscleGroup" "MuscleGroup";
