-- CreateEnum
CREATE TYPE "TeacherEarningType" AS ENUM ('SALE', 'REFUND', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "teacher_earnings" (
    "id" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "courseId" UUID,
    "purchaseId" UUID,
    "paymentSubmissionId" UUID,
    "type" "TeacherEarningType" NOT NULL,
    "grossAmountMmk" INTEGER NOT NULL DEFAULT 0,
    "commissionRateBps" INTEGER NOT NULL DEFAULT 0,
    "commissionAmountMmk" INTEGER NOT NULL DEFAULT 0,
    "amountMmk" INTEGER NOT NULL,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'MMK',
    "note" TEXT,
    "metadata" JSONB,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teacher_earnings_purchaseId_key" ON "teacher_earnings"("purchaseId");

-- CreateIndex
CREATE INDEX "teacher_earnings_teacherId_idx" ON "teacher_earnings"("teacherId");

-- CreateIndex
CREATE INDEX "teacher_earnings_courseId_idx" ON "teacher_earnings"("courseId");

-- CreateIndex
CREATE INDEX "teacher_earnings_createdAt_idx" ON "teacher_earnings"("createdAt");

-- AddForeignKey
ALTER TABLE "teacher_earnings" ADD CONSTRAINT "teacher_earnings_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_earnings" ADD CONSTRAINT "teacher_earnings_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_earnings" ADD CONSTRAINT "teacher_earnings_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_earnings" ADD CONSTRAINT "teacher_earnings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
