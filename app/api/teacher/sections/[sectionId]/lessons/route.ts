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
        { message: "ابتدا وارد حساب کاربری شوید." },
        { status: 401 },
      );
    }

    if (session.role !== "TEACHER" && session.role !== "ADMIN") {
      return Response.json({ message: "دسترسی غیرمجاز." }, { status: 403 });
    }

    const { sectionId } = await params;

    const section = await prisma.courseSection.findUnique({
      where: {
        id: sectionId,
      },
      include: {
        course: true,
        lessons: {
          orderBy: {
            order: "desc",
          },
          take: 1,
        },
      },
    });

    if (!section) {
      return Response.json({ message: "فصل پیدا نشد." }, { status: 404 });
    }

    if (
      session.role !== "ADMIN" &&
      section.course.teacherId !== session.userId
    ) {
      return Response.json(
        { message: "شما مالک این دوره نیستید." },
        { status: 403 },
      );
    }

    const body = await request.json();

    const title = typeof body.title === "string" ? body.title.trim() : "";

    const description =
      typeof body.description === "string" ? body.description.trim() : null;

    if (!title) {
      return Response.json(
        { message: "عنوان درس الزامی است." },
        { status: 400 },
      );
    }

    const nextOrder =
      section.lessons.length > 0 ? section.lessons[0].order + 1 : 1;

    const lesson = await prisma.lesson.create({
      data: {
        sectionId,
        title,
        description,
        order: nextOrder,
      },
    });

    return Response.json({
      success: true,
      lesson,
    });
  } catch (error) {
    console.error("CREATE_LESSON_ERROR:", error);

    return Response.json(
      {
        message: "خطایی هنگام ایجاد درس رخ داد.",
      },
      { status: 500 },
    );
  }
}
