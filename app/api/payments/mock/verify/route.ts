import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return Response.json(
        {
          message: "ابتدا وارد حساب شوید.",
        },
        { status: 401 },
      );
    }

    const body = await request.json();

    const paymentId = body.paymentId;

    const success = body.success === true;

    if (!paymentId) {
      return Response.json(
        {
          message: "شناسه پرداخت وجود ندارد.",
        },
        { status: 400 },
      );
    }

    const payment = await prisma.payment.findUnique({
      where: {
        id: paymentId,
      },
    });

    if (!payment) {
      return Response.json(
        {
          message: "پرداخت پیدا نشد.",
        },
        { status: 404 },
      );
    }

    /*
     * امنیت:
     * این Payment باید متعلق به همین کاربر باشد.
     */

    if (payment.userId !== session.userId) {
      return Response.json(
        {
          message: "دسترسی غیرمجاز.",
        },
        { status: 403 },
      );
    }

    /*
     * پرداخت موفق
     */

    if (success) {
      const result = await prisma.$transaction(async (tx) => {
        const updatedPayment = await tx.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            status: "SUCCESS",
            transactionId: `MOCK-${Date.now()}`,
            paidAt: new Date(),
          },
        });

        const enrollment = await tx.enrollment.upsert({
          where: {
            userId_courseId: {
              userId: payment.userId,
              courseId: payment.courseId,
            },
          },

          update: {
            status: "ACTIVE",
            enrolledAt: new Date(),
          },

          create: {
            userId: payment.userId,
            courseId: payment.courseId,
            status: "ACTIVE",
          },
        });

        const lessons = await tx.lesson.findMany({
          where: {
            section: {
              courseId: payment.courseId,
            },

            status: "PUBLISHED",
          },

          select: {
            id: true,
          },
        });

        if (lessons.length > 0) {
          await tx.lessonProgress.createMany({
            data: lessons.map((lesson) => ({
              enrollmentId: enrollment.id,

              lessonId: lesson.id,

              status: "NOT_STARTED",
            })),

            skipDuplicates: true,
          });
        }

        return {
          payment: updatedPayment,
          enrollment,
        };
      });

      return Response.json({
        success: true,

        redirectUrl: `/payment/success?paymentId=${result.payment.id}`,
      });
    }

    /*
     * پرداخت ناموفق
     */

    await prisma.payment.update({
      where: {
        id: payment.id,
      },

      data: {
        status: "FAILED",
      },
    });

    return Response.json({
      success: true,

      redirectUrl: `/payment/failed?paymentId=${payment.id}`,
    });
  } catch (error) {
    console.error("VERIFY_PAYMENT_ERROR:", error);

    return Response.json(
      {
        message: "خطایی هنگام بررسی پرداخت رخ داد.",
      },
      { status: 500 },
    );
  }
}
