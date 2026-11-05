-- CYC-238: disposición de la pizarra de gráficos del Resumen, una por coach.
-- Aditiva: solo crea una tabla nueva; no toca ninguna existente.
-- CreateTable
CREATE TABLE "CoachSummaryLayout" (
    "coachId" TEXT NOT NULL,
    "charts" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachSummaryLayout_pkey" PRIMARY KEY ("coachId")
);

-- AddForeignKey
ALTER TABLE "CoachSummaryLayout" ADD CONSTRAINT "CoachSummaryLayout_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

