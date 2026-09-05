import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";
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

    const lesson = await prisma.lesson.findUnique({
      where: {
        id: lessonId,
      },
      include: {
        section: true,
      },
    });

    if (!lesson) {
      return Response.json({ message: "درس پیدا نشد." }, { status: 404 });
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

    /*
     * تکمیل Lesson
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
        completedAt: new Date(),
      },

      create: {
        enrollmentId: enrollment.id,
        lessonId,
        status: "COMPLETED",
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    /*
     * تمام درس‌های منتشرشده دوره
     */

    const totalLessons = await prisma.lesson.count({
      where: {
        section: {
          courseId: lesson.section.courseId,
        },
        status: "PUBLISHED",
      },
    });

    /*
     * درس‌های تکمیل‌شده
     */

    const completedLessons = await prisma.lessonProgress.count({
      where: {
        enrollmentId: enrollment.id,
        status: "COMPLETED",

        lesson: {
          status: "PUBLISHED",
        },
      },
    });

    const courseCompleted =
      totalLessons > 0 && completedLessons >= totalLessons;

    /*
     * اگر همه درس‌ها تمام شده‌اند
     */

    if (courseCompleted) {
      await prisma.enrollment.update({
        where: {
          id: enrollment.id,
        },

        data: {
          status: "COMPLETED",
        },
      });
      const user = await prisma.user.findUnique({
        where: {
          id: session.userId,
        },
      });

      const course = await prisma.course.findUnique({
        where: {
          id: lesson.section.courseId,
        },
      });
      if (user?.phone && course) {
        try {
          await sendSms({
            phone: user.phone,

            message: `🎓 تبریک! شما دوره "${course.title}" را با موفقیت به پایان رساندید.`,
          });
        } catch (smsError) {
          console.error("COURSE_COMPLETE_SMS_ERROR:", smsError);
        }
      }
    }

    return Response.json({
      success: true,

      progress,

      courseCompleted,

      completedLessons,

      totalLessons,

      percentage:
        totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0,
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
