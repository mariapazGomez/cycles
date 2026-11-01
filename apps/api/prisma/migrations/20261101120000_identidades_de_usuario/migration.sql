-- Identidades de inicio de sesión social (Google, Apple). Aditiva: no cambia
-- ninguna tabla existente.
CREATE TABLE "UserIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "subject" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserIdentity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserIdentity_provider_subject_key" ON "UserIdentity"("provider", "subject");

CREATE INDEX "UserIdentity_userId_idx" ON "UserIdentity"("userId");

ALTER TABLE "UserIdentity" ADD CONSTRAINT "UserIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
