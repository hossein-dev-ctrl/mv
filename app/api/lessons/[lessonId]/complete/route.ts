import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLessonAccess } from "@/lib/lesson-access";

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      lessonId: string;
    }>;
  },
) {
  try {
    const session = await getSession();

    if (!session) {
      return Response.json(
        { message: "ابتدا وارد حساب شوید." },
        { status: 401 },
      );
    }

    const { lessonId } = await params;

    /*
     * بررسی دسترسی واقعی کاربر به Lesson
     */
    const access = await getLessonAccess(session.userId, lessonId);

    if (!access.allowed) {
      return Response.json(
        {
          message: "این درس هنوز برای شما باز نشده است.",
          reason: access.reason,
        },
        { status: 403 },
      );
    }

    /*
     * اطلاعات Lesson
     */
    const lesson = await prisma.lesson.findUnique({
      where: {
        id: lessonId,
      },
      include: {
        section: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!lesson) {
      return Response.json(
        { message: "درس پیدا نشد." },
        { status: 404 },
      );
    }

    const courseId = lesson.section.courseId;

    /*
     * Enrollment کاربر
     */
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId,
        },
      },
    });

    if (!enrollment || enrollment.status === "CANCELLED") {
      return Response.json(
        {
          message: "شما به این دوره دسترسی ندارید.",
        },
        { status: 403 },
      );
    }

    /*
     * زمان فعلی را یک بار می‌گیریم
     */
    const now = new Date();

    /*
     * ثبت تکمیل Lesson
     *
     * اگر رکورد قبلاً وجود داشته باشد:
     * همان رکورد COMPLETED می‌شود.
     *
     * اگر وجود نداشته باشد:
     * ساخته می‌شود.
     */
    const progress = await prisma.lessonProgress.upsert({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: enrollment.id,
          lessonId,
        },
      },

      update: {
        status: "COMPLETED",
        completedAt: now,
      },

      create: {
        enrollmentId: enrollment.id,
        lessonId,
        status: "COMPLETED",
        startedAt: now,
        completedAt: now,
      },
    });

    /*
     * تعداد تمام Lessonهای Published دوره
     */
    const totalLessons = await prisma.lesson.count({
      where: {
        section: {
          courseId,
        },
        status: "PUBLISHED",
      },
    });

    /*
     * تعداد Lessonهای تکمیل‌شده
     */
    const completedLessons = await prisma.lessonProgress.count({
      where: {
        enrollmentId: enrollment.id,
        status: "COMPLETED",

        lesson: {
          status: "PUBLISHED",
          section: {
            courseId,
          },
        },
      },
    });

    const courseCompleted =
      totalLessons > 0 &&
      completedLessons >= totalLessons;

    /*
     * اگر تمام Lessonهای دوره تکمیل شده‌اند،
     * Enrollment را COMPLETED می‌کنیم.
     */
    if (courseCompleted && enrollment.status !== "COMPLETED") {
      await prisma.enrollment.update({
        where: {
          id: enrollment.id,
        },
        data: {
          status: "COMPLETED",
        },
      });
    }

    /*
     * درصد پیشرفت
     */
    const percentage =
      totalLessons > 0
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0;

    return Response.json({
      success: true,

      progress: {
        id: progress.id,
        lessonId: progress.lessonId,
        status: progress.status,
        startedAt: progress.startedAt,
        completedAt: progress.completedAt,
      },

      courseCompleted,

      completedLessons,

      totalLessons,

      percentage,
    });
  } catch (error) {
    console.error("COMPLETE_LESSON_ERROR:", error);

    return Response.json(
      {
        message: "تکمیل درس ناموفق بود.",
      },
      { status: 500 },
    );
  }
}