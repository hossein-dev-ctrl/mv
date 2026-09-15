import { finalizePayment } from "@/lib/finalize-payment";
import { prisma } from "@/lib/prisma";
import { verifyPayment } from "@/lib/zarinpal";
import { sendSms } from "@/lib/sms";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const authority = url.searchParams.get("Authority");

    const status = url.searchParams.get("Status");

    if (!authority) {
      return Response.redirect(
        `${APP_URL}/payment/failed?reason=missing_authority`,
      );
    }

    const payment = await prisma.payment.findUnique({
      where: {
        authority,
      },

      include: {
        course: true,
      },
    });

    if (!payment) {
      return Response.redirect(
        `${APP_URL}/payment/failed?reason=payment_not_found`,
      );
    }

    /*
     * اگر قبلاً SUCCESS شده،
     * دوباره پردازش نکن.
     */

    if (payment.userId === payment.course.teacherId) {
      return Response.redirect(`${APP_URL}/payment/failed?reason=own_course`);
    }

    if (payment.status === "SUCCESS") {
      return Response.redirect(
        `${APP_URL}/payment/success?paymentId=${payment.id}`,
      );
    }

    /*
     * کاربر از پرداخت منصرف شده
     */

    if (status !== "OK") {
      await prisma.payment.updateMany({
        where: {
          id: payment.id,
          status: { not: "SUCCESS" },
        },

        data: {
          status: "CANCELLED",
        },
      });

      return Response.redirect(
        `${APP_URL}/payment/failed?paymentId=${payment.id}`,
      );
    }

    /*
     * Verify واقعی
     */

    const verification = await verifyPayment(payment.amount, authority);

    const code = verification?.data?.code;

    const refId = verification?.data?.ref_id;

    /*
     * کدهای موفقیت باید مطابق
     * مستندات نسخه فعال زرین‌پال
     * بررسی شوند.
     */

    if (code !== 100 && code !== 101) {
      await prisma.payment.updateMany({
        where: {
          id: payment.id,
          status: { not: "SUCCESS" },
        },

        data: {
          status: "FAILED",
        },
      });

      return Response.redirect(
        `${APP_URL}/payment/failed?paymentId=${payment.id}`,
      );
    }

    /*
     * Payment + Enrollment
     * در یک Transaction
     */

    if (!refId) throw new Error("شماره تراکنش معتبر دریافت نشد.");
    const completion = await finalizePayment(payment.id, String(refId));

    const user = await prisma.user.findUnique({
      where: {
        id: payment.userId,
      },
    });

    if (completion.newlyCompleted && user?.phone) {
      try {
        await sendSms({
          type: "pattern",
          phone: user.phone,
          patternCode: "BymlU64xOK",
          variables: {
            course: "موفقیت",
          },
        });
      } catch (smsError) {
        console.error("========== SMS_SEND_ERROR ==========");

        console.dir(smsError, {
          depth: null,
          colors: true,
        });

        console.error("JSON:", JSON.stringify(smsError, null, 2));

        console.error("====================================");
        console.error("SMS_SEND_ERROR:", smsError);
      }
    }

    return Response.redirect(
      `${APP_URL}/payment/success?paymentId=${payment.id}`,
    );
  } catch (error) {
    console.error("ZARINPAL_CALLBACK_ERROR:", error);

    return Response.redirect(`${APP_URL}/payment/failed?reason=server_error`);
  }
}
