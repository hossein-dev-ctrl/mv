import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requestPayment, getPaymentUrl } from "@/lib/zarinpal";

export async function POST(request: Request) {
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

    const body = await request.json();

    const courseId = body.courseId;

    if (!courseId) {
      return Response.json(
        {
          message: "شناسه دوره ارسال نشده است.",
        },
        { status: 400 },
      );
    }

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

    if (course.status !== "PUBLISHED") {
      return Response.json(
        {
          message: "این دوره قابل خرید نیست.",
        },
        { status: 400 },
      );
    }

    if (course.price <= 0) {
      return Response.json(
        {
          message: "این دوره رایگان است.",
        },
        { status: 400 },
      );
    }

    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId,
        },
      },
    });

    if (existingEnrollment && existingEnrollment.status !== "CANCELLED") {
      return Response.json(
        {
          message: "شما قبلاً در این دوره ثبت‌نام کرده‌اید.",
        },
        { status: 400 },
      );
    }

    /*
     * اگر پرداخت PENDING قبلی داریم،
     * دوباره Payment نساز.
     */

    const existingPayment = await prisma.payment.findFirst({
      where: {
        userId: session.userId,
        courseId,
        status: "PENDING",
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    const payment =
      existingPayment ||
      (await prisma.payment.create({
        data: {
          userId: session.userId,
          courseId,
          amount: course.price,
          status: "PENDING",
        },
      }));

    const user = await prisma.user.findUnique({
      where: {
        id: session.userId,
      },
    });

    /*
     * درخواست به زرین‌پال
     */

    const zarinpal = await requestPayment({
      amount: course.price,
      description: `خرید دوره ${course.title}`,
      email: user?.email || undefined,
      mobile: user?.phone || undefined,
    });

    const code = zarinpal?.data?.code;

    const authority = zarinpal?.data?.authority;

    if (code !== 100 && code !== 101) {
      console.error("ZARINPAL REQUEST:", zarinpal);

      throw new Error("زرین‌پال درخواست پرداخت را قبول نکرد.");
    }

    if (!authority) {
      throw new Error("Authority از زرین‌پال دریافت نشد.");
    }

    await prisma.payment.update({
      where: {
        id: payment.id,
      },

      data: {
        authority,
      },
    });

    return Response.json({
      success: true,

      paymentId: payment.id,

      paymentUrl: getPaymentUrl(authority),
    });
  } catch (error) {
    console.error("CREATE_PAYMENT_ERROR:", error);

    return Response.json(
      {
        message:
          error instanceof Error ? error.message : "خطا در ایجاد پرداخت.",
      },
      { status: 500 },
    );
  }
}
