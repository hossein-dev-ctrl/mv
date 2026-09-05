import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

const ALLOWED_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

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
          success: false,
          message: "ابتدا وارد حساب کاربری شوید.",
        },
        { status: 401 },
      );
    }

    if (session.role !== "TEACHER" && session.role !== "ADMIN") {
      return Response.json(
        {
          success: false,
          message: "دسترسی غیرمجاز.",
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
          message: "درس پیدا نشد.",
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
          message: "شما اجازه آپلود ویدئوی این درس را ندارید.",
        },
        { status: 403 },
      );
    }

    const formData = await request.formData();

    const file = formData.get("video");
    const durationValue = formData.get("duration");

    if (!(file instanceof File)) {
      return Response.json(
        {
          success: false,
          message: "فایل ویدئو انتخاب نشده است.",
        },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json(
        {
          success: false,
          message: "فرمت ویدئو مجاز نیست. فقط MP4، WebM و MOV مجاز هستند.",
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        {
          success: false,
          message: "حجم ویدئو نباید بیشتر از 500 مگابایت باشد.",
        },
        { status: 400 },
      );
    }

    let duration: number | null = null;

    if (typeof durationValue === "string") {
      const parsedDuration = Number(durationValue);

      if (Number.isFinite(parsedDuration) && parsedDuration >= 0) {
        duration = Math.round(parsedDuration);
      }
    }

    const extensionMap: Record<string, string> = {
      "video/mp4": "mp4",
      "video/webm": "webm",
      "video/quicktime": "mov",
    };

    const extension = extensionMap[file.type] || "mp4";

    const filename = `${crypto.randomUUID()}.${extension}`;

    const uploadDirectory = path.join(
      process.cwd(),
      "public",
      "uploads",
      "lessons",
    );

    await fs.mkdir(uploadDirectory, {
      recursive: true,
    });

    const filePath = path.join(uploadDirectory, filename);

    const arrayBuffer = await file.arrayBuffer();

    await fs.writeFile(filePath, Buffer.from(arrayBuffer));

    // حذف ویدئوی قبلی
    if (lesson.videoUrl) {
      try {
        const oldPath = path.join(
          process.cwd(),
          "public",
          lesson.videoUrl.replace(/^\//, ""),
        );

        await fs.unlink(oldPath);
      } catch {
        // اگر فایل قبلی وجود نداشت، ادامه بده
      }
    }

    const videoUrl = `/uploads/lessons/${filename}`;

    const updatedLesson = await prisma.lesson.update({
      where: {
        id: lessonId,
      },
      data: {
        videoUrl,
        videoDuration: duration,
      },
    });

    return Response.json({
      success: true,
      message: "ویدئو با موفقیت آپلود شد.",
      lesson: updatedLesson,
    });
  } catch (error) {
    console.error("UPLOAD_LESSON_VIDEO_ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "خطایی هنگام آپلود ویدئو رخ داد.",
      },
      { status: 500 },
    );
  }
}
