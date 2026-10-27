-- CreateEnum
CREATE TYPE "PayoutRequestStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'PAID');

-- AlterEnum
ALTER TYPE "TeacherEarningType" ADD VALUE 'PAYOUT';

-- CreateTable
CREATE TABLE "payout_requests" (
    "id" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "amountMmk" INTEGER NOT NULL,
    "status" "PayoutRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "note" TEXT,
    "reviewNote" TEXT,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payout_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payout_requests_teacherId_idx" ON "payout_requests"("teacherId");
CREATE INDEX "payout_requests_status_idx" ON "payout_requests"("status");

ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "payout_transactions" (
    "id" UUID NOT NULL,
    "payoutRequestId" UUID NOT NULL,
    "recordedById" UUID NOT NULL,
    "amountMmk" INTEGER NOT NULL,
    "reference" VARCHAR(120) NOT NULL,
    "note" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payout_transactions_payoutRequestId_key" ON "payout_transactions"("payoutRequestId");
CREATE UNIQUE INDEX "payout_transactions_reference_key" ON "payout_transactions"("reference");
CREATE INDEX "payout_transactions_recordedById_idx" ON "payout_transactions"("recordedById");

ALTER TABLE "payout_transactions" ADD CONSTRAINT "payout_transactions_payoutRequestId_fkey" FOREIGN KEY ("payoutRequestId") REFERENCES "payout_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payout_transactions" ADD CONSTRAINT "payout_transactions_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable teacher_earnings
ALTER TABLE "teacher_earnings" ADD COLUMN "payoutRequestId" UUID;
CREATE UNIQUE INDEX "teacher_earnings_payoutRequestId_key" ON "teacher_earnings"("payoutRequestId");
ALTER TABLE "teacher_earnings" ADD CONSTRAINT "teacher_earnings_payoutRequestId_fkey" FOREIGN KEY ("payoutRequestId") REFERENCES "payout_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
