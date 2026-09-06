import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const lesson = await prisma.lesson.findUnique({
      where: {
        id: lessonId,
      },
      include: {
        section: true,
      },
    });

    if (!lesson) {
      return Response.json(
        {
          message: "درس پیدا نشد.",
        },
        { status: 404 },
      );
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId: lesson.section.courseId,
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

    const existingProgress = await prisma.lessonProgress.findUnique({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: enrollment.id,
          lessonId,
        },
      },
    });

    /*
     * اگر Progress قبلاً وجود داشته باشد،
     * مخصوصاً اگر COMPLETED باشد،
     * نباید وضعیت آن تغییر کند.
     */
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
