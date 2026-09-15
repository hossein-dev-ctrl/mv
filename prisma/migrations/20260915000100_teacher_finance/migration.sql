ALTER TABLE "User" ADD COLUMN "teacherSharePercent" INTEGER;
ALTER TABLE "Payment" ADD COLUMN "teacherSharePercent" INTEGER,
ADD COLUMN "teacherShareAmount" INTEGER,
ADD COLUMN "isTest" BOOLEAN;
ALTER TABLE "User" ADD CONSTRAINT "User_teacherSharePercent_range" CHECK ("teacherSharePercent" BETWEEN 0 AND 100);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_teacherSharePercent_range" CHECK ("teacherSharePercent" BETWEEN 0 AND 100),
ADD CONSTRAINT "Payment_teacherShareAmount_range" CHECK ("teacherShareAmount" >= 0 AND "teacherShareAmount" <= "amount");
UPDATE "Payment" SET "isTest" = true WHERE "transactionId" LIKE 'MOCK-%';
