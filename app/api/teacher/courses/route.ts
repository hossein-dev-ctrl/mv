import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const createCourseSchema = z.object({
  title: z.string().min(3, "عنوان دوره کوتاه است"),

  slug: z
    .string()
    .min(3, "Slug نامعتبر است")
    .regex(/^[a-z0-9-]+$/, "Slug باید فقط شامل حروف انگلیسی، عدد و - باشد"),

  shortDescription: z.string().max(500).optional().nullable(),

  description: z.string().optional().nullable(),

  price: z.number().int().min(0),

  thumbnailUrl: z.string().url().optional().nullable().or(z.literal("")),

  roadmapImageUrl: z.string().url().optional().nullable().or(z.literal("")),
});

export async function POST(request: Request) {
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
          message: "شما اجازه ایجاد دوره ندارید",
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    const result = createCourseSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        {
          success: false,
          message: "اطلاعات وارد شده صحیح نیست",
          errors: result.error.flatten(),
        },
        { status: 400 },
      );
    }

    const data = result.data;

    const existingCourse = await prisma.course.findUnique({
      where: {
        slug: data.slug,
      },
    });

    if (existingCourse) {
      return Response.json(
        {
          success: false,
          message: "این Slug قبلاً استفاده شده است",
        },
        { status: 409 },
      );
    }

    const course = await prisma.course.create({
      data: {
        teacherId: session.userId,

        title: data.title,
        slug: data.slug,

        shortDescription: data.shortDescription || null,

        description: data.description || null,

        price: data.price,

        thumbnailUrl: data.thumbnailUrl || null,

        roadmapImageUrl: data.roadmapImageUrl || null,

        status: "DRAFT",
      },
    });

    return Response.json(
      {
        success: true,
        message: "دوره با موفقیت ایجاد شد",
        course,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("CREATE_COURSE_ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "خطایی هنگام ایجاد دوره رخ داد",
      },
      { status: 500 },
    );
  }
}
