import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_TYPES = [
  "application/pdf",

  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",

  "application/zip",
  "application/x-zip-compressed",

  "image/jpeg",
  "image/png",
  "image/webp",
];

function getExtension(fileName: string) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "file";
}

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
          message: "شما اجازه افزودن فایل به این درس را ندارید.",
        },
        { status: 403 },
      );
    }

    const formData = await request.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json(
        {
          success: false,
          message: "فایل انتخاب نشده است.",
        },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json(
        {
          success: false,
          message: "فرمت این فایل مجاز نیست.",
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        {
          success: false,
          message: "حجم فایل نباید بیشتر از 50 مگابایت باشد.",
        },
        { status: 400 },
      );
    }

    const extension = getExtension(file.name);

    const filename = `${crypto.randomUUID()}.${extension}`;

    const uploadDirectory = path.join(
      process.cwd(),
      "public",
      "uploads",
      "lesson-files",
    );

    await fs.mkdir(uploadDirectory, {
      recursive: true,
    });

    const filePath = path.join(uploadDirectory, filename);

    const arrayBuffer = await file.arrayBuffer();

    await fs.writeFile(filePath, Buffer.from(arrayBuffer));

    const url = `/uploads/lesson-files/${filename}`;

    const lessonFile = await prisma.lessonFile.create({
      data: {
        lessonId,
        name: file.name,
        url,
        type: file.type,
        size: file.size,
      },
    });

    return Response.json({
      success: true,
      message: "فایل با موفقیت اضافه شد.",
      file: lessonFile,
    });
  } catch (error) {
    console.error("UPLOAD_LESSON_FILE_ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "خطایی هنگام آپلود فایل رخ داد.",
      },
      { status: 500 },
    );
  }
}
