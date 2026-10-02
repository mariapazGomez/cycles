-- CreateTable
CREATE TABLE "ActivityDigest" (
    "day" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityDigest_pkey" PRIMARY KEY ("day")
);

