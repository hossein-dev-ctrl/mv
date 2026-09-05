import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return Response.json(
        {
          message: "ابتدا وارد حساب کاربری شوید.",
        },
        { status: 401 },
      );
    }

    const body = await request.json();

    const courseId = body.courseId;

    if (typeof courseId !== "string" || !courseId) {
      return Response.json(
        {
          message: "دوره نامعتبر است.",
        },
        { status: 400 },
      );
    }

    const course = await prisma.course.findUnique({
      where: {
        id: courseId,
      },
    });

    if (!course) {
      return Response.json(
        {
          message: "دوره پیدا نشد.",
        },
        { status: 404 },
      );
    }

    if (course.status !== "PUBLISHED") {
      return Response.json(
        {
          message: "این دوره در حال حاضر قابل ثبت‌نام نیست.",
        },
        { status: 400 },
      );
    }

    /*
     * بررسی ثبت‌نام قبلی
     */

    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId: course.id,
        },
      },
    });

    if (existingEnrollment && existingEnrollment.status !== "CANCELLED") {
      return Response.json({
        success: true,
        message: "شما قبلاً در این دوره ثبت‌نام کرده‌اید.",
        enrollment: existingEnrollment,
      });
    }

    /*
     * فعلاً برای تست:
     *
     * دوره رایگان → مستقیم Enrollment
     *
     * دوره پولی → فعلاً Enrollment مستقیم نمی‌سازیم.
     * در مرحله بعد به Payment و درگاه وصل می‌شود.
     */

    if (course.price > 0) {
      return Response.json(
        {
          message: "این دوره نیاز به پرداخت دارد.",
          requiresPayment: true,
        },
        { status: 402 },
      );
    }

    const enrollment = await prisma.enrollment.upsert({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId: course.id,
        },
      },

      update: {
        status: "ACTIVE",
        enrolledAt: new Date(),
      },

      create: {
        userId: session.userId,
        courseId: course.id,
        status: "ACTIVE",
      },
    });

    /*
     * ایجاد Progress برای تمام Lessonها
     */

    const lessons = await prisma.lesson.findMany({
      where: {
        section: {
          courseId: course.id,
        },
        status: "PUBLISHED",
      },

      select: {
        id: true,
      },
    });

    if (lessons.length > 0) {
      await prisma.lessonProgress.createMany({
        data: lessons.map((lesson) => ({
          enrollmentId: enrollment.id,
          lessonId: lesson.id,
          status: "NOT_STARTED",
        })),

        skipDuplicates: true,
      });
    }

    return Response.json({
      success: true,
      message: "ثبت‌نام با موفقیت انجام شد.",
      enrollment,
    });
  } catch (error) {
    console.error("ENROLLMENT_ERROR:", error);

    return Response.json(
      {
        message: "خطایی هنگام ثبت‌نام رخ داد.",
      },
      { status: 500 },
    );
  }
}
