ALTER TABLE "Course" ADD COLUMN "launchSmsPending" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "CourseStartSms" (
 "id" TEXT NOT NULL PRIMARY KEY, "interestId" TEXT NOT NULL,
 "phone" TEXT NOT NULL, "message" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING',
 "attempts" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "claimedAt" TIMESTAMP(3), "sentAt" TIMESTAMP(3), "lastError" TEXT,
 CONSTRAINT "CourseStartSms_interestId_fkey" FOREIGN KEY ("interestId") REFERENCES "CourseInterest"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CourseStartSms_interestId_key" ON "CourseStartSms"("interestId");
CREATE INDEX "CourseStartSms_status_createdAt_idx" ON "CourseStartSms"("status","createdAt");
