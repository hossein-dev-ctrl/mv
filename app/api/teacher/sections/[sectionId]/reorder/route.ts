import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      sectionId: string;
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

    const { sectionId } = await params;

    const body = await request.json();

    const direction = body.direction;

    if (direction !== "up" && direction !== "down") {
      return Response.json(
        { message: "جهت جابه‌جایی نامعتبر است." },
        { status: 400 },
      );
    }

    const section = await prisma.courseSection.findUnique({
      where: {
        id: sectionId,
      },
      include: {
        course: true,
      },
    });

    if (!section) {
      return Response.json({ message: "فصل پیدا نشد." }, { status: 404 });
    }

    if (
      session.role !== "ADMIN" &&
      section.course.teacherId !== session.userId
    ) {
      return Response.json({ message: "دسترسی غیرمجاز." }, { status: 403 });
    }

    const targetSection =
      direction === "up"
        ? await prisma.courseSection.findFirst({
            where: {
              courseId: section.courseId,
              order: {
                lt: section.order,
              },
            },
            orderBy: {
              order: "desc",
            },
          })
        : await prisma.courseSection.findFirst({
            where: {
              courseId: section.courseId,
              order: {
                gt: section.order,
              },
            },
            orderBy: {
              order: "asc",
            },
          });

    if (!targetSection) {
      return Response.json({
        success: true,
        message: "این فصل قابل جابه‌جایی نیست.",
      });
    }

    await prisma.$transaction([
      prisma.courseSection.update({
        where: {
          id: section.id,
        },
        data: {
          order: -1,
        },
      }),

      prisma.courseSection.update({
        where: {
          id: targetSection.id,
        },
        data: {
          order: section.order,
        },
      }),

      prisma.courseSection.update({
        where: {
          id: section.id,
        },
        data: {
          order: targetSection.order,
        },
      }),
    ]);

    return Response.json({
      success: true,
      message: "ترتیب فصل تغییر کرد.",
    });
  } catch (error) {
    console.error("REORDER_SECTION_ERROR:", error);

    return Response.json(
      {
        message: "خطایی هنگام مرتب‌سازی فصل رخ داد.",
      },
      { status: 500 },
    );
  }
}
