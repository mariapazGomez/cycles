-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('plan_assigned', 'session_added', 'session_changed', 'session_scheduled', 'session_logged');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "groupKey" TEXT NOT NULL,
    "planId" TEXT,
    "sessionId" TEXT,
    "count" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "readAt" TIMESTAMP(3),
    "visibleAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_visibleAt_idx" ON "Notification"("userId", "visibleAt");

-- CreateIndex
CREATE INDEX "Notification_userId_groupKey_readAt_idx" ON "Notification"("userId", "groupKey", "readAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

