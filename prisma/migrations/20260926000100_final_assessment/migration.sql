-- CreateTable
CREATE TABLE "FinalExam" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "examWeight" INTEGER NOT NULL DEFAULT 50,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinalExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamAttempt" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "score" INTEGER,
    "feedback" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinalFeedback" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "teacherNote" TEXT NOT NULL DEFAULT '',
    "adminNote" TEXT NOT NULL DEFAULT '',
    "teacherUpdatedAt" TIMESTAMP(3),
    "adminUpdatedAt" TIMESTAMP(3),

    CONSTRAINT "FinalFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseReview" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "authorType" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinalExam_courseId_key" ON "FinalExam"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamAttempt_enrollmentId_key" ON "ExamAttempt"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "FinalFeedback_enrollmentId_key" ON "FinalFeedback"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseReview_enrollmentId_key" ON "CourseReview"("enrollmentId");

-- AddForeignKey
ALTER TABLE "FinalExam" ADD CONSTRAINT "FinalExam_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_examId_fkey" FOREIGN KEY ("examId") REFERENCES "FinalExam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalFeedback" ADD CONSTRAINT "FinalFeedback_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseReview" ADD CONSTRAINT "CourseReview_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FinalExam" ADD CONSTRAINT "FinalExam_weight_check" CHECK ("examWeight" BETWEEN 0 AND 100);
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_score_check" CHECK ("score" IS NULL OR "score" BETWEEN 0 AND 100);
ALTER TABLE "CourseReview" ADD CONSTRAINT "CourseReview_rating_check" CHECK ("rating" BETWEEN 1 AND 5), ADD CONSTRAINT "CourseReview_author_check" CHECK ("authorType" IN ('STUDENT','PARENT'));
