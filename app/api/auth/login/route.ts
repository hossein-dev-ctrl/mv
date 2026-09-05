import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { createSession } from "@/lib/auth";
import { z } from "zod";

const loginSchema = z.object({
  phone: z.string().min(10),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        {
          success: false,
          message: "اطلاعات ورود صحیح نیست",
        },
        { status: 400 },
      );
    }

    const { phone, password } = result.data;

    const user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user || !user.passwordHash) {
      return Response.json(
        {
          success: false,
          message: "شماره موبایل یا رمز عبور اشتباه است",
        },
        { status: 401 },
      );
    }

    const passwordValid = await compare(password, user.passwordHash);

    if (!passwordValid) {
      return Response.json(
        {
          success: false,
          message: "شماره موبایل یا رمز عبور اشتباه است",
        },
        { status: 401 },
      );
    }

    const token = await createSession({
      userId: user.id,
      role: user.role,
    });

    const response = Response.json({
      success: true,
      message: "ورود موفق بود",
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });

    response.headers.append(
      "Set-Cookie",
      `session=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax${
        process.env.NODE_ENV === "production" ? "; Secure" : ""
      }`,
    );

    return response;
  } catch (error) {
    console.error("LOGIN_ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "خطایی در ورود رخ داد",
      },
      { status: 500 },
    );
  }
}
