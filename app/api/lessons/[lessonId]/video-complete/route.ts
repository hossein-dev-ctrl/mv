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

    const lesson = access.lesson;

    if (!lesson.videoUrl) {
      return Response.json(
        {
          message: "این درس ویدئو ندارد.",
        },
        { status: 400 },
      );
    }

    const now = new Date();

    const progress = await prisma.lessonProgress.upsert({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: enrollment.id,
          lessonId,
        },
      },
      update: {
        videoCompletedAt: now,
        status: "IN_PROGRESS",
      },
      create: {
        enrollmentId: enrollment.id,
        lessonId,
        status: "IN_PROGRESS",
        startedAt: now,
        videoCompletedAt: now,
      },
    });

    return Response.json({
      success: true,
      videoCompletedAt: progress.videoCompletedAt,
    });
  } catch (error) {
    console.error("VIDEO_COMPLETE_ERROR:", error);

    return Response.json(
      {
        message: "ثبت پایان ویدئو ناموفق بود.",
      },
      { status: 500 },
    );
  }
}
