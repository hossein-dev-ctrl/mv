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
        { message: "ابتدا وارد حساب شوید." },
        { status: 401 },
      );
    }

    if (session.role !== "TEACHER" && session.role !== "ADMIN") {
      return Response.json({ message: "دسترسی غیرمجاز." }, { status: 403 });
    }

    const { lessonId } = await params;

    const body = await request.json();

    const direction = body.direction;

    if (direction !== "up" && direction !== "down") {
      return Response.json({ message: "جهت نامعتبر است." }, { status: 400 });
    }

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
      return Response.json({ message: "درس پیدا نشد." }, { status: 404 });
    }

    if (
      session.role !== "ADMIN" &&
      lesson.section.course.teacherId !== session.userId
    ) {
      return Response.json({ message: "دسترسی غیرمجاز." }, { status: 403 });
    }

    const targetLesson =
      direction === "up"
        ? await prisma.lesson.findFirst({
            where: {
              sectionId: lesson.sectionId,
              order: {
                lt: lesson.order,
              },
            },
            orderBy: {
              order: "desc",
            },
          })
        : await prisma.lesson.findFirst({
            where: {
              sectionId: lesson.sectionId,
              order: {
                gt: lesson.order,
              },
            },
            orderBy: {
              order: "asc",
            },
          });

    if (!targetLesson) {
      return Response.json({
        success: true,
        message: "این درس قابل جابه‌جایی نیست.",
      });
    }

    await prisma.$transaction([
      prisma.lesson.update({
        where: {
          id: lesson.id,
        },
        data: {
          order: -1,
        },
      }),

      prisma.lesson.update({
        where: {
          id: targetLesson.id,
        },
        data: {
          order: lesson.order,
        },
      }),

      prisma.lesson.update({
        where: {
          id: lesson.id,
        },
        data: {
          order: targetLesson.order,
        },
      }),
    ]);

    return Response.json({
      success: true,
      message: "ترتیب درس تغییر کرد.",
    });
  } catch (error) {
    console.error("REORDER_LESSON_ERROR:", error);

    return Response.json(
      {
        message: "خطایی هنگام مرتب‌سازی درس رخ داد.",
      },
      { status: 500 },
    );
  }
}
