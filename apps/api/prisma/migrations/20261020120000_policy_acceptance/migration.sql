-- CreateEnum
CREATE TYPE "PolicyAcceptanceSource" AS ENUM ('register', 'invitation', 'google_profile', 'reaccept');

-- CreateTable
CREATE TABLE "PolicyAcceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "source" "PolicyAcceptanceSource" NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PolicyAcceptance_userId_idx" ON "PolicyAcceptance"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyAcceptance_userId_version_key" ON "PolicyAcceptance"("userId", "version");

-- AddForeignKey
ALTER TABLE "PolicyAcceptance" ADD CONSTRAINT "PolicyAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

