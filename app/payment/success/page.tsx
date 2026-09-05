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
    },
  });

  if (!payment) {
    redirect("/dashboard");
  }

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-gray-50 p-6"
    >
      <div className="w-full max-w-lg rounded-3xl border bg-white p-8 text-center shadow-sm">
        <div className="text-6xl">🎉</div>

        <h1 className="mt-5 text-3xl font-bold text-green-600">
          پرداخت موفق بود
        </h1>

        <p className="mt-3 text-gray-600">
          ثبت‌نام شما در دوره با موفقیت انجام شد.
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

        <div className="mt-6 flex gap-3">
          <Link
            href={`/courses/${payment.course.slug}`}
            className="flex-1 rounded-xl bg-indigo-600 px-5 py-3 text-white"
          >
            ورود به دوره
          </Link>

          <Link
            href="/dashboard"
            className="flex-1 rounded-xl border px-5 py-3"
          >
            داشبورد
          </Link>
        </div>
      </div>
    </main>
  );
}
