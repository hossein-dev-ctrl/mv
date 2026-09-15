import { prisma } from "@/lib/prisma";
import { calculateTeacherShare } from "@/lib/finance-math";

// Both verified gateway responses and local mock tests use the same ownership
// checks and conditional claim. Repeated callbacks cannot reset enrollments.
export async function finalizePayment(paymentId: string, transactionId: string, mock = false) {
  return prisma.$transaction(async tx => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: { course: { select: { teacherId: true, teacher: { select: { teacherSharePercent: true } } } } },
    });
    if (!payment) throw new Error("پرداخت پیدا نشد.");
    if (payment.userId === payment.course.teacherId) throw new Error("مدرس نمی‌تواند در دورهٔ خودش ثبت‌نام کند.");
    if (payment.status === "SUCCESS") return { newlyCompleted: false };
    const percent = payment.course.teacher.teacherSharePercent;
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: { not: "SUCCESS" } },
      data: { status: "SUCCESS", transactionId, paidAt: new Date(), isTest: mock || payment.isTest,
        teacherSharePercent: percent, teacherShareAmount: calculateTeacherShare(payment.amount, percent) },
    });
    if (!claimed.count) return { newlyCompleted: false };
    const existing = await tx.enrollment.findUnique({ where: { userId_courseId: { userId: payment.userId, courseId: payment.courseId } } });
    // Preserve existing active/completed learning; only a cancelled enrollment is reactivated.
    const enrollment = existing && existing.status !== "CANCELLED" ? existing : await tx.enrollment.upsert({
      where: { userId_courseId: { userId: payment.userId, courseId: payment.courseId } },
      create: { userId: payment.userId, courseId: payment.courseId },
      update: { status: "ACTIVE", enrolledAt: new Date() },
    });
    const lessons = await tx.lesson.findMany({ where: { section: { courseId: payment.courseId }, status: "PUBLISHED" }, select: { id: true } });
    if (lessons.length) await tx.lessonProgress.createMany({ data: lessons.map(lesson => ({ enrollmentId: enrollment.id, lessonId: lesson.id, status: "NOT_STARTED" })), skipDuplicates: true });
    return { newlyCompleted: true };
  });
}
