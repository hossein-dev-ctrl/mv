import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
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
          message: "ابتدا وارد حساب کاربری شوید.",
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
        section: {
          include: {
            course: true,
          },
        },

        files: true,
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

    /*
     * بررسی Enrollment
     */

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
          message: "شما در این دوره ثبت‌نام نکرده‌اید.",
        },
        { status: 403 },
      );
    }

    /*
     * پیدا کردن Progress
     */

    const progress = await prisma.lessonProgress.findUnique({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: enrollment.id,
          lessonId: lesson.id,
        },
      },
    });

    return Response.json({
      success: true,

      lesson: {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        videoUrl: lesson.videoUrl,
        videoDuration: lesson.videoDuration,
        files: lesson.files,
      },

      progress,
    });
  } catch (error) {
    console.error("GET_LESSON_ERROR:", error);

    return Response.json(
      {
        message: "خطایی هنگام دریافت درس رخ داد.",
      },
      { status: 500 },
    );
  }
}
