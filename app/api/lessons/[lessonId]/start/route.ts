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
        {
          message: "ابتدا وارد حساب شوید.",
        },
        { status: 401 },
      );
    }

    const { lessonId } = await params;

    /*
     * تمام بررسی‌های دسترسی Lesson
     * از منطق مرکزی انجام می‌شود.
     */
    const access = await getLessonAccess(session.userId, lessonId);

    if (!access.allowed) {
      return Response.json(
        {
          message: "این درس برای شما قابل دسترسی نیست.",
          reason: access.reason,
        },
        { status: 403 },
      );
    }

    const enrollment = access.enrollment;

    if (!enrollment) {
      return Response.json(
        {
          message: "ثبت‌نام فعال برای این دوره پیدا نشد.",
        },
        { status: 403 },
      );
    }

    /*
     * اگر Progress قبلاً وجود داشته باشد،
     * مخصوصاً اگر COMPLETED باشد،
     * نباید وضعیت آن تغییر کند.
     */
    const existingProgress = enrollment.progresses.find(
      (progress) => progress.lessonId === lessonId,
    );

    if (existingProgress) {
      return Response.json({
        success: true,
        progress: existingProgress,
      });
    }

    /*
     * اگر Progress وجود نداشته باشد،
     * Lesson را در وضعیت IN_PROGRESS شروع می‌کنیم.
     */
    const progress = await prisma.lessonProgress.create({
      data: {
        enrollmentId: enrollment.id,
        lessonId,
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
    });

    return Response.json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error("START_LESSON_ERROR:", error);

    return Response.json(
      {
        message: "شروع درس ناموفق بود.",
      },
      { status: 500 },
    );
  }
}
