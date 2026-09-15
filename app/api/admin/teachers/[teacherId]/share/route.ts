import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateTeacherShare } from "@/lib/finance-math";

export async function PATCH(request: Request, { params }: { params: Promise<{ teacherId: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ message: "ابتدا وارد شوید." }, { status: 401 });
  const actor = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true } });
  if (session.role !== "ADMIN" || actor?.role !== "ADMIN") return Response.json({ message: "فقط مدیر مجاز است." }, { status: 403 });
  let body;
  try { body = await request.json(); } catch { return Response.json({ message: "درخواست نامعتبر است." }, { status: 400 }); }
  if (!body || typeof body.percent !== "number" || !Number.isInteger(body.percent) || body.percent < 0 || body.percent > 100 || typeof body.applyUnallocated !== "boolean") {
    return Response.json({ message: "درصد باید عدد صحیح بین صفر و صد باشد." }, { status: 400 });
  }
  const { teacherId } = await params;
  const teacher = await prisma.user.findUnique({ where: { id: teacherId }, select: { role: true } });
  if (!teacher || teacher.role !== "TEACHER") return Response.json({ message: "مدرس پیدا نشد." }, { status: 404 });
  const count = await prisma.$transaction(async tx => {
    await tx.user.update({ where: { id: teacherId }, data: { teacherSharePercent: body.percent } });
    if (!body.applyUnallocated) return 0;
    const payments = await tx.payment.findMany({
      where: { course: { teacherId }, userId: { not: teacherId }, status: "SUCCESS", refund: null, teacherShareAmount: null, isTest: false,
        OR: [{ transactionId: null }, { transactionId: { not: { startsWith: "MOCK-" } } }] },
      select: { id: true, amount: true },
    });
    let allocated = 0;
    for (const payment of payments) {
      const updated = await tx.payment.updateMany({ where: { id: payment.id, teacherShareAmount: null },
        data: { teacherSharePercent: body.percent, teacherShareAmount: calculateTeacherShare(payment.amount, body.percent) } });
      allocated += updated.count;
    }
    return allocated;
  });
  return Response.json({ message: `درصد ذخیره شد. سهم ${count.toLocaleString("fa-IR")} پرداخت قبلی تعیین شد.` });
}
