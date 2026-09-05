import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteProps = {
  params: Promise<{
    lessonId: string;
  }>;
};

export async function PATCH(request: Request, { params }: RouteProps) {
  try {
    const session = await getSession();

    if (!session) {
      return Response.json(
        {
          success: false,
          message: "ابتدا وارد حساب کاربری شوید",
        },
        { status: 401 },
      );
    }

    if (session.role !== "TEACHER" && session.role !== "ADMIN") {
      return Response.json(
        {
          success: false,
          message: "دسترسی غیرمجاز",
        },
        { status: 403 },
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
      },
    });

    if (!lesson) {
      return Response.json(
        {
          success: false,
          message: "درس پیدا نشد",
        },
        { status: 404 },
      );
    }

    if (
      session.role !== "ADMIN" &&
      lesson.section.course.teacherId !== session.userId
    ) {
      return Response.json(
        {
          success: false,
          message: "شما اجازه ویرایش این درس را ندارید",
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    const data: {
      title?: string;
      description?: string | null;
      videoUrl?: string | null;
      videoDuration?: number | null;
      status?: "DRAFT" | "PUBLISHED";
    } = {};

    if (typeof body.title === "string") {
      data.title = body.title.trim();
    }

    if (typeof body.description === "string" || body.description === null) {
      data.description = body.description;
    }

    if (typeof body.videoUrl === "string" || body.videoUrl === null) {
      data.videoUrl = body.videoUrl;
    }

    if (typeof body.videoDuration === "number" || body.videoDuration === null) {
      data.videoDuration = body.videoDuration;
    }

    if (body.status === "DRAFT" || body.status === "PUBLISHED") {
      data.status = body.status;
    }

    const updatedLesson = await prisma.lesson.update({
      where: {
        id: lessonId,
      },
      data,
    });

    return Response.json({
      success: true,
      lesson: updatedLesson,
    });
  } catch (error) {
    console.error("UPDATE_LESSON_ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "خطایی هنگام ویرایش درس رخ داد",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
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

    await prisma.lesson.delete({
      where: {
        id: lessonId,
      },
    });

    return Response.json({
      success: true,
      message: "درس حذف شد.",
    });
  } catch (error) {
    console.error("DELETE_LESSON_ERROR:", error);

    return Response.json(
      {
        message: "خطایی هنگام حذف درس رخ داد.",
      },
      { status: 500 },
    );
  }
}
