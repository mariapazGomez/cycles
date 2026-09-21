-- CreateTable
CREATE TABLE "AthleteInvitationToken" (
    "id" TEXT NOT NULL,
    "coachAthleteId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AthleteInvitationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AthleteInvitationToken_coachAthleteId_key" ON "AthleteInvitationToken"("coachAthleteId");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteInvitationToken_tokenHash_key" ON "AthleteInvitationToken"("tokenHash");

-- AddForeignKey
ALTER TABLE "AthleteInvitationToken" ADD CONSTRAINT "AthleteInvitationToken_coachAthleteId_fkey" FOREIGN KEY ("coachAthleteId") REFERENCES "CoachAthlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
