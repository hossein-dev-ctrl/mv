import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSectionSchema = z.object({
  title: z.string().min(1, "عنوان فصل الزامی است"),
  description: z.string().optional().nullable(),
});

type RouteProps = {
  params: Promise<{
    courseId: string;
  }>;
};

export async function POST(request: Request, { params }: RouteProps) {
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
          message: "شما اجازه ایجاد فصل ندارید",
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
          success: false,
          message: "دوره پیدا نشد",
        },
        { status: 404 },
      );
    }

    if (session.role !== "ADMIN" && course.teacherId !== session.userId) {
      return Response.json(
        {
          success: false,
          message: "شما اجازه مدیریت این دوره را ندارید",
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    const result = createSectionSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        {
          success: false,
          message: "اطلاعات فصل صحیح نیست",
        },
        { status: 400 },
      );
    }

    const lastSection = await prisma.courseSection.findFirst({
      where: {
        courseId,
      },
      orderBy: {
        order: "desc",
      },
    });

    const nextOrder = lastSection ? lastSection.order + 1 : 1;

    const section = await prisma.courseSection.create({
      data: {
        courseId,
        title: result.data.title,
        description: result.data.description || null,
        order: nextOrder,
      },
    });

    return Response.json(
      {
        success: true,
        message: "فصل با موفقیت ایجاد شد",
        section,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("CREATE_SECTION_ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "خطایی هنگام ایجاد فصل رخ داد",
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

    if (session.role !== "ADMIN" && course.teacherId !== session.userId) {
      return Response.json(
        {
          message: "شما اجازه ویرایش این دوره را ندارید.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();

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
