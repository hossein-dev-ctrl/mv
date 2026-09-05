import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      fileId: string;
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

    const { fileId } = await params;

    const file = await prisma.lessonFile.findUnique({
      where: {
        id: fileId,
      },
      include: {
        lesson: {
          include: {
            section: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    if (!file) {
      return Response.json({ message: "فایل پیدا نشد." }, { status: 404 });
    }

    if (
      session.role !== "ADMIN" &&
      file.lesson.section.course.teacherId !== session.userId
    ) {
      return Response.json({ message: "دسترسی غیرمجاز." }, { status: 403 });
    }

    try {
      const filePath = path.join(
        process.cwd(),
        "public",
        file.url.replace(/^\//, ""),
      );

      await fs.unlink(filePath);
    } catch {
      // فایل فیزیکی قبلاً حذف شده
    }

    await prisma.lessonFile.delete({
      where: {
        id: fileId,
      },
    });

    return Response.json({
      success: true,
      message: "فایل حذف شد.",
    });
  } catch (error) {
    console.error("DELETE_LESSON_FILE_ERROR:", error);

    return Response.json(
      {
        message: "خطایی هنگام حذف فایل رخ داد.",
      },
      { status: 500 },
    );
  }
}
