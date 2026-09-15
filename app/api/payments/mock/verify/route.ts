import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { finalizePayment } from "@/lib/finalize-payment";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") return Response.json({ message: "پرداخت آزمایشی در محیط عملیاتی غیرفعال است." }, { status: 403 });
  try {
    const session = await getSession();
    if (!session) return Response.json({ message: "ابتدا وارد حساب شوید." }, { status: 401 });
    const body = await request.json();
    if (typeof body.paymentId !== "string" || typeof body.success !== "boolean") return Response.json({ message: "درخواست نامعتبر است." }, { status: 400 });
    const payment = await prisma.payment.findUnique({ where: { id: body.paymentId }, include: { course: { select: { teacherId: true } } } });
    if (!payment) return Response.json({ message: "پرداخت پیدا نشد." }, { status: 404 });
    if (payment.userId !== session.userId || payment.course.teacherId === session.userId) return Response.json({ message: "ثبت‌نام در دورهٔ خود یا پرداخت شخص دیگر مجاز نیست." }, { status: 403 });
    if (payment.status === "SUCCESS") return Response.json({ success: true, redirectUrl: `/payment/success?paymentId=${payment.id}` });
    if (body.success) await finalizePayment(payment.id, `MOCK-${payment.id}`, true);
    else await prisma.payment.updateMany({ where: { id: payment.id, status: { not: "SUCCESS" } }, data: { status: "FAILED", isTest: true } });
    return Response.json({ success: true, redirectUrl: `/payment/${body.success ? "success" : "failed"}?paymentId=${payment.id}` });
  } catch {
    return Response.json({ message: "بررسی پرداخت انجام نشد." }, { status: 400 });
  }
}
