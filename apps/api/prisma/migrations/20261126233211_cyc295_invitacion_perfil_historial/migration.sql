-- CreateEnum
CREATE TYPE "PilotInvitationStatus" AS ENUM ('queued', 'sending', 'sent', 'failed', 'used');

-- CreateTable
CREATE TABLE "PilotInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT,
    "status" "PilotInvitationStatus" NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "queuedAt" TIMESTAMP(3),
    "attemptedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "usedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PilotInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachProfile" (
    "userId" TEXT NOT NULL,
    "places" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "modes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sports" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "noSpecificSport" BOOLEAN NOT NULL DEFAULT false,
    "athleteRange" TEXT,
    "tools" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "trainingTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "otherTexts" JSONB NOT NULL DEFAULT '{}',
    "origin" TEXT NOT NULL,
    "lastStep" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "RegisteredEmail" (
    "fingerprint" TEXT NOT NULL,
    "firstRegisteredAt" TIMESTAMP(3) NOT NULL,
    "lastAccountDeletedAt" TIMESTAMP(3),

    CONSTRAINT "RegisteredEmail_pkey" PRIMARY KEY ("fingerprint")
);

-- CreateIndex
CREATE UNIQUE INDEX "PilotInvitation_email_key" ON "PilotInvitation"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PilotInvitation_tokenHash_key" ON "PilotInvitation"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "PilotInvitation_usedByUserId_key" ON "PilotInvitation"("usedByUserId");

-- CreateIndex
CREATE INDEX "PilotInvitation_status_queuedAt_idx" ON "PilotInvitation"("status", "queuedAt");

-- CreateIndex
CREATE INDEX "PilotInvitation_sentAt_idx" ON "PilotInvitation"("sentAt");

-- CreateIndex
CREATE INDEX "PilotInvitation_createdAt_idx" ON "PilotInvitation"("createdAt");

-- AddForeignKey
ALTER TABLE "PilotInvitation" ADD CONSTRAINT "PilotInvitation_usedByUserId_fkey" FOREIGN KEY ("usedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachProfile" ADD CONSTRAINT "CoachProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
