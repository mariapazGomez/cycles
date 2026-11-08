-- CYC-251: actividades paralelas del atleta (voleibol, partidos…) con repetición como regla y excepciones.
-- Aditiva: solo crea tipos y tablas nuevas; no toca ninguna existente.
-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('training', 'match', 'rest', 'travel', 'injury', 'other');

-- CreateEnum
CREATE TYPE "EventSport" AS ENUM ('volleyball', 'soccer', 'basketball', 'running', 'cycling', 'swimming', 'weights', 'yoga', 'other');

-- CreateEnum
CREATE TYPE "EventIntensity" AS ENUM ('low', 'medium', 'high');

-- CreateTable
CREATE TABLE "AthleteEvent" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "sport" "EventSport",
    "title" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT,
    "durationMin" INTEGER,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "intensity" "EventIntensity",
    "notes" TEXT,
    "repeatDays" INTEGER[],
    "repeatUntil" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteEventException" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "overrides" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AthleteEventException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AthleteEvent_athleteId_date_idx" ON "AthleteEvent"("athleteId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteEventException_eventId_date_key" ON "AthleteEventException"("eventId", "date");

-- AddForeignKey
ALTER TABLE "AthleteEvent" ADD CONSTRAINT "AthleteEvent_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteEventException" ADD CONSTRAINT "AthleteEventException_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "AthleteEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

