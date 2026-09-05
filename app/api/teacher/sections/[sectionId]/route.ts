import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
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
        {
          message: "ابتدا وارد حساب کاربری شوید.",
        },
        { status: 401 },
      );
    }

    if (session.role !== "TEACHER" && session.role !== "ADMIN") {
      return Response.json(
        {
          message: "دسترسی غیرمجاز.",
        },
        { status: 403 },
      );
    }

    const { sectionId } = await params;

    const section = await prisma.courseSection.findUnique({
      where: {
        id: sectionId,
      },
      include: {
        course: true,
      },
    });

    if (!section) {
      return Response.json(
        {
          message: "فصل پیدا نشد.",
        },
        { status: 404 },
      );
    }

    if (
      session.role !== "ADMIN" &&
      section.course.teacherId !== session.userId
    ) {
      return Response.json(
        {
          message: "شما اجازه حذف این فصل را ندارید.",
        },
        { status: 403 },
      );
    }

    await prisma.courseSection.delete({
      where: {
        id: sectionId,
      },
    });

    return Response.json({
      success: true,
      message: "فصل با موفقیت حذف شد.",
    });
  } catch (error) {
    console.error("DELETE_SECTION_ERROR:", error);

    return Response.json(
      {
        message: "خطایی هنگام حذف فصل رخ داد.",
      },
      { status: 500 },
    );
  }
}
