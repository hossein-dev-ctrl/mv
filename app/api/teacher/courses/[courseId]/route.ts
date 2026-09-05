import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import fs from "fs/promises";
import path from "path";

export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      courseId: string;
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

    const { courseId } = await params;

    const course = await prisma.course.findUnique({
      where: {
        id: courseId,
      },
      include: {
        sections: {
          include: {
            lessons: {
              include: {
                files: true,
              },
            },
          },
        },
      },
    });

    if (!course) {
      return Response.json(
        {
          message: "دوره پیدا نشد.",
        },
        { status: 404 },
      );
    }

    if (session.role !== "ADMIN" && course.teacherId !== session.userId) {
      return Response.json(
        {
          message: "شما اجازه حذف این دوره را ندارید.",
        },
        { status: 403 },
      );
    }

    /*
     * اگر دوره پرداخت موفق داشته باشد،
     * فعلاً اجازه حذف کامل نمی‌دهیم.
     *
     * چون سابقه مالی نباید از بین برود.
     */

    const paymentCount = await prisma.payment.count({
      where: {
        courseId,
      },
    });

    if (paymentCount > 0) {
      return Response.json(
        {
          message:
            "این دوره دارای سابقه تراکنش است و حذف کامل آن امکان‌پذیر نیست. لطفاً دوره را آرشیو کنید.",
        },
        { status: 400 },
      );
    }

    /*
     * حذف فایل‌های فیزیکی Lessonها
     */

    for (const section of course.sections) {
      for (const lesson of section.lessons) {
        if (lesson.videoUrl) {
          try {
            const videoPath = path.join(
              process.cwd(),
              "public",
              lesson.videoUrl.replace(/^\//, ""),
            );

            await fs.unlink(videoPath);
          } catch {
            // فایل قبلاً حذف شده یا وجود ندارد
          }
        }

        for (const file of lesson.files) {
          try {
            const filePath = path.join(
              process.cwd(),
              "public",
              file.url.replace(/^\//, ""),
            );

            await fs.unlink(filePath);
          } catch {
            // فایل قبلاً حذف شده
          }
        }
      }
    }

    /*
     * حذف Thumbnail و Roadmap
     */

    const images = [course.thumbnailUrl, course.roadmapImageUrl];

    for (const imageUrl of images) {
      if (!imageUrl) continue;

      try {
        const imagePath = path.join(
          process.cwd(),
          "public",
          imageUrl.replace(/^\//, ""),
        );

        await fs.unlink(imagePath);
      } catch {
        // فایل وجود ندارد
      }
    }

    /*
     * حذف Course
     *
     * به دلیل onDelete: Cascade
     * Sectionها، Lessonها، Fileها،
     * Enrollmentها و Progressها حذف می‌شوند.
     */

    await prisma.course.delete({
      where: {
        id: courseId,
      },
    });

    return Response.json({
      success: true,
      message: "دوره با موفقیت حذف شد.",
    });
  } catch (error) {
    console.error("DELETE_COURSE_ERROR:", error);

    return Response.json(
      {
        message: "خطایی هنگام حذف دوره رخ داد.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      courseId: string;
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

    const { courseId } = await params;

    const course = await prisma.course.findUnique({
      where: {
        id: courseId,
      },
    });

    if (!course) {
      return Response.json(
        {
          message: "دوره پیدا نشد.",
        },
        { status: 404 },
      );
    }

    // بررسی مالکیت دوره
    if (session.role !== "ADMIN" && course.teacherId !== session.userId) {
      return Response.json(
        {
          message: "شما اجازه ویرایش این دوره را ندارید.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    /*
     * اگر فقط status ارسال شده باشد،
     * وضعیت دوره را تغییر می‌دهیم.
     */

    if (body.status !== undefined) {
      const status = body.status;

      if (
        status !== "DRAFT" &&
        status !== "PUBLISHED" &&
        status !== "ARCHIVED"
      ) {
        return Response.json(
          {
            message: "وضعیت دوره نامعتبر است.",
          },
          { status: 400 },
        );
      }

      const updatedCourse = await prisma.course.update({
        where: {
          id: courseId,
        },
        data: {
          status,
        },
      });

      return Response.json({
        success: true,
        course: updatedCourse,
      });
    }

    /*
     * در غیر این صورت اطلاعات دوره
     * را ویرایش می‌کنیم.
     */

    const title = typeof body.title === "string" ? body.title.trim() : "";

    const shortDescription =
      typeof body.shortDescription === "string"
        ? body.shortDescription.trim()
        : null;

    const description =
      typeof body.description === "string" ? body.description.trim() : null;

    const thumbnailUrl =
      typeof body.thumbnailUrl === "string" && body.thumbnailUrl.trim()
        ? body.thumbnailUrl.trim()
        : null;

    const roadmapImageUrl =
      typeof body.roadmapImageUrl === "string" && body.roadmapImageUrl.trim()
        ? body.roadmapImageUrl.trim()
        : null;

    const price = Number(body.price);

    if (!title) {
      return Response.json(
        {
          message: "عنوان دوره الزامی است.",
        },
        { status: 400 },
      );
    }

    if (Number.isNaN(price) || price < 0) {
      return Response.json(
        {
          message: "قیمت دوره باید یک عدد معتبر باشد.",
        },
        { status: 400 },
      );
    }

    const updatedCourse = await prisma.course.update({
      where: {
        id: courseId,
      },
      data: {
        title,
        shortDescription,
        description,
        thumbnailUrl,
        roadmapImageUrl,
        price,
      },
    });

    return Response.json({
      success: true,
      course: updatedCourse,
    });
  } catch (error) {
    console.error("UPDATE_COURSE_ERROR:", error);

    return Response.json(
      {
        message: "خطایی هنگام ویرایش دوره رخ داد.",
      },
      { status: 500 },
    );
  }
}
