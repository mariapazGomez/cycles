-- Invitación automática a TestFlight para atletas con iPhone (CYC-194). Aditiva:
-- columna nueva que admite nulos y tabla nueva; las filas existentes no cambian.
-- Ver docs/prds/features/PRD-InvitacionAtletas.md.
CREATE TYPE "PhonePlatform" AS ENUM ('ios', 'android');
CREATE TYPE "BetaInviteStatus" AS ENUM ('pending', 'invited', 'failed');

ALTER TABLE "User" ADD COLUMN "phonePlatform" "PhonePlatform";

CREATE TABLE "BetaInvite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "BetaInviteStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "invitedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BetaInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BetaInvite_userId_key" ON "BetaInvite"("userId");
CREATE UNIQUE INDEX "BetaInvite_email_key" ON "BetaInvite"("email");

ALTER TABLE "BetaInvite" ADD CONSTRAINT "BetaInvite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
