import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(3, "نام باید حداقل 3 کاراکتر باشد"),
  phone: z.string().min(10, "شماره موبایل معتبر نیست"),
  password: z.string().min(6, "رمز عبور باید حداقل ۶ کاراکتر باشد"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = registerSchema.safeParse(body);

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

    const { name, phone, password } = result.data;

    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      return Response.json(
        {
          success: false,
          message: "این شماره موبایل قبلاً ثبت شده است",
        },
        { status: 409 },
      );
    }

    const passwordHash = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        phone,
        passwordHash,
        role: "STUDENT",
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
      },
    });

    return Response.json(
      {
        success: true,
        message: "ثبت‌نام با موفقیت انجام شد",
        user,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("REGISTER_ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "خطایی در ثبت‌نام رخ داد",
      },
      { status: 500 },
    );
  }
}
