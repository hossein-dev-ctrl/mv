
import ThemeIcon from '@/components/panel/theme-icon';
import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Props = {
  searchParams: Promise<{
    paymentId?: string;
  }>;
};

export default async function PaymentSuccessPage({ searchParams }: Props) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const { paymentId } = await searchParams;

  if (!paymentId) {
    redirect("/dashboard");
  }

  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      userId: session.userId,
    },

    include: {
      course: true,
      refund: true,
    },
  });

  if (!payment || payment.status !== "SUCCESS") {
    redirect("/payments");
  }

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-gray-50 p-6"
    >
      <div className="w-full max-w-lg rounded-3xl border bg-white p-8 text-center shadow-sm">
        <div className="text-6xl">🎉</div>

        <h1 className="mt-5 text-3xl font-bold text-green-600">
          {payment.refund ? "وجه این پرداخت بازگردانده شده است" : "پرداخت موفق بود"}
        </h1>

        <p className="mt-3 text-gray-600">
          {payment.refund ? `بازپرداخت کامل به مبلغ ${payment.refund.amount.toLocaleString("fa-IR")} تومان ثبت شده است. شماره پیگیری: ${payment.refund.reference}` : "پرداخت شما با موفقیت ثبت شده است. وضعیت دسترسی دوره را در بخش دوره‌های ثبت‌نام‌شده ببینید."}
        </p>

        <div className="mt-6 rounded-2xl bg-gray-50 p-5 text-right">
          <div className="flex justify-between">
            <span>دوره</span>
            <strong>{payment.course.title}</strong>
          </div>

          <div className="mt-3 flex justify-between">
            <span>مبلغ</span>
            <strong>{payment.amount.toLocaleString("fa-IR")} تومان</strong>
          </div>

          {payment.transactionId && (
            <div className="mt-3 flex justify-between">
              <span>شماره تراکنش</span>

              <strong dir="ltr">{payment.transactionId}</strong>
            </div>
          )}
        </div>

        <Link href="/payments" className="mt-5 inline-block text-sm text-indigo-600 hover:underline"><ThemeIcon name="arrow" className="me-2 h-4 w-4"/>بازگشت به سوابق پرداخت</Link>

        <div className="mt-6 flex flex-wrap gap-3">
          {payment.course.status === "PUBLISHED" && <Link
            href={`/courses/${payment.course.slug}`}
            className="flex-1 rounded-xl bg-indigo-600 px-5 py-3 text-white"
          ><ThemeIcon name="book" className="me-2 h-4 w-4"/>
            ورود به دوره
          </Link>}

          <Link
            href="/dashboard"
            className="flex-1 rounded-xl border px-5 py-3"
          ><ThemeIcon name="arrow" className="me-2 h-4 w-4"/>
            داشبورد
          </Link>
        </div>
      </div>
    </main>
  );
}
