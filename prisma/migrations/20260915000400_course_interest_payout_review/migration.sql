ALTER TABLE "Course" ADD COLUMN "deliveryStatus" TEXT NOT NULL DEFAULT 'ONGOING', ADD COLUMN "teacherIntro" TEXT;
ALTER TABLE "Course" ADD CONSTRAINT "Course_deliveryStatus_check" CHECK ("deliveryStatus" IN ('UPCOMING','ONGOING','COMPLETED'));
ALTER TABLE "Payout" ADD COLUMN "disputedAt" TIMESTAMP(3), ADD COLUMN "disputeReason" TEXT, ADD COLUMN "reviewedAt" TIMESTAMP(3), ADD COLUMN "reviewNote" TEXT;
CREATE TABLE "CourseInterest" (
 "id" TEXT PRIMARY KEY, "courseId" TEXT NOT NULL REFERENCES "Course"("id") ON DELETE CASCADE,
 "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
 "name" TEXT NOT NULL, "phone" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE ("courseId","userId")
);
CREATE INDEX "CourseInterest_courseId_createdAt_idx" ON "CourseInterest"("courseId","createdAt");
CREATE TABLE "PayoutReview" ("id" TEXT PRIMARY KEY, "payoutId" TEXT NOT NULL REFERENCES "Payout"("id") ON DELETE CASCADE, "actorId" TEXT NOT NULL, "action" TEXT NOT NULL, "message" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "PayoutReview_payoutId_createdAt_idx" ON "PayoutReview"("payoutId","createdAt");
