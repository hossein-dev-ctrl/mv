CREATE TABLE "Assignment" (
 "id" TEXT PRIMARY KEY, "lessonId" TEXT NOT NULL UNIQUE REFERENCES "Lesson"("id") ON DELETE CASCADE,
 "title" TEXT NOT NULL, "instructions" TEXT NOT NULL, "published" BOOLEAN NOT NULL DEFAULT false,
 "version" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "Submission" (
 "id" TEXT PRIMARY KEY, "assignmentId" TEXT NOT NULL REFERENCES "Assignment"("id") ON DELETE RESTRICT,
 "enrollmentId" TEXT NOT NULL REFERENCES "Enrollment"("id") ON DELETE CASCADE,
 "isLatest" BOOLEAN NOT NULL DEFAULT true, "attempt" INTEGER NOT NULL, "answer" TEXT NOT NULL, "projectUrl" TEXT,
 "assignmentTitle" TEXT NOT NULL, "assignmentInstructions" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PENDING', "score" INTEGER, "feedback" TEXT,
 "reviewedBy" TEXT, "reviewedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE ("assignmentId","enrollmentId","attempt"),
 CONSTRAINT "Submission_attempt_check" CHECK ("attempt">0),
 CONSTRAINT "Submission_review_check" CHECK (
 ("status"='PENDING' AND "score" IS NULL AND "reviewedAt" IS NULL AND "reviewedBy" IS NULL) OR
 ("status"='REVISION' AND "score" IS NULL AND "reviewedAt" IS NOT NULL AND "reviewedBy" IS NOT NULL) OR
 ("status"='GRADED' AND "score" BETWEEN 0 AND 100 AND "score" IS NOT NULL AND "reviewedAt" IS NOT NULL AND "reviewedBy" IS NOT NULL))
);
CREATE INDEX "Submission_assignmentId_status_createdAt_idx" ON "Submission"("assignmentId","status","createdAt");
CREATE INDEX "Submission_enrollmentId_idx" ON "Submission"("enrollmentId");
CREATE UNIQUE INDEX "Submission_one_latest" ON "Submission"("assignmentId","enrollmentId") WHERE "isLatest"=true;
