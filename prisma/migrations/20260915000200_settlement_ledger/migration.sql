-- CreateTable
CREATE TABLE "FinanceSettings" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "minimumPayout" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "iban" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "fee" INTEGER NOT NULL DEFAULT 0,
    "reference" TEXT,
    "note" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cutoffAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "processedBy" TEXT,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRefund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "teacherDebit" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "refundedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "PaymentRefund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentCost" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "PaymentCost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payout_reference_key" ON "Payout"("reference");

-- CreateIndex
CREATE INDEX "Payout_teacherId_status_idx" ON "Payout"("teacherId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRefund_paymentId_key" ON "PaymentRefund"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRefund_reference_key" ON "PaymentRefund"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentCost_paymentId_key" ON "PaymentCost"("paymentId");

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentCost" ADD CONSTRAINT "PaymentCost_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Payout_one_open_per_teacher" ON "Payout"("teacherId") WHERE "status" IN ('REQUESTED','PROCESSING');
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_amount_check" CHECK ("amount" > 0 AND "fee" >= 0 AND "fee" < "amount"),
ADD CONSTRAINT "Payout_status_check" CHECK ("status" IN ('REQUESTED','PROCESSING','PAID','REJECTED')),
ADD CONSTRAINT "Payout_paid_check" CHECK ("status" <> 'PAID' OR ("reference" IS NOT NULL AND "paidAt" IS NOT NULL)),
ADD CONSTRAINT "Payout_received_check" CHECK ("receivedAt" IS NULL OR "status" = 'PAID');
ALTER TABLE "FinanceSettings" ADD CONSTRAINT "minimumPayout_check" CHECK ("minimumPayout" > 0);
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "refund_amount_check" CHECK ("amount" > 0 AND "teacherDebit" >= 0 AND "teacherDebit" <= "amount");
ALTER TABLE "PaymentCost" ADD CONSTRAINT "cost_amount_check" CHECK ("amount" >= 0);
