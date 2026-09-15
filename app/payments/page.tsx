import Link from "next/link";
import { redirect } from "next/navigation";
import type { PaymentStatus } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const labels: Record<PaymentStatus, string> = {
  PENDING: "در انتظار تأیید", SUCCESS: "موفق", FAILED: "ناموفق", CANCELLED: "لغوشده",
};
const colors: Record<PaymentStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800", SUCCESS: "bg-emerald-50 text-emerald-700",
  FAILED: "bg-rose-50 text-rose-700", CANCELLED: "bg-slate-100 text-slate-600",
};
const date = (value: Date) => new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran",
}).format(value);

export default async function PaymentHistoryPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const query = await searchParams;
  const status = typeof query.status === "string" && Object.hasOwn(labels, query.status)
    ? query.status as PaymentStatus : undefined;
  const requested = typeof query.page === "string" ? Number(query.page) : 1;
  const where = { userId: session.userId, ...(status ? { status } : {}) };
  const total = await prisma.payment.count({ where });
  const pages = Math.max(1, Math.ceil(total / 20));
  const page = Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, pages) : 1;
  const payments = await prisma.payment.findMany({
    where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 20, skip: (page - 1) * 20,
    select: {
      id: true, amount: true, status: true, transactionId: true, createdAt: true, paidAt: true,
      course: { select: { title: true, slug: true, status: true } },
    },
  });
  const pageUrl = (number: number) => `/payments?${new URLSearchParams({page: String(number), ...(status ? { status } : {})})}`;
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/dashboard" className="text-sm text-indigo-600 hover:underline">بازگشت به دوره‌های ثبت‌نام‌شده</Link>
      <h1 className="mt-4 text-2xl font-bold">سوابق پرداخت من</h1>
      <p className="mt-2 text-sm leading-7 text-slate-500">نتیجهٔ ثبت‌شدهٔ پرداخت‌ها و شمارهٔ تراکنش‌های خود را اینجا ببینید. ثبت‌نام رایگان در سوابق پرداخت نمایش داده نمی‌شود.</p>
      <form action="/payments" className="my-6 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div><label htmlFor="payment-status" className="mb-2 block text-sm">وضعیت پرداخت</label>
          <select id="payment-status" name="status" defaultValue={status ?? ""} className="rounded-xl border border-slate-300 px-3 py-2">
            <option value="">همهٔ پرداخت‌ها</option>
            {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <button className="rounded-xl bg-indigo-600 px-5 py-2 text-sm text-white hover:bg-indigo-700" type="submit">اعمال فیلتر</button>
        {status && <Link href="/payments" className="px-2 py-2 text-sm text-indigo-600">پاک کردن فیلتر</Link>}
      </form>
      <p className="mb-4 text-sm text-slate-500">{total.toLocaleString("fa-IR")} پرداخت</p>
      {payments.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center"><p className="text-slate-600">{status ? "پرداختی با این وضعیت پیدا نشد." : "هنوز پرداختی در حساب شما ثبت نشده است."}</p><Link href="/courses" className="mt-4 inline-block text-sm text-indigo-600">مشاهدهٔ دوره‌ها</Link></div> : (
        <div className="space-y-4">{payments.map(payment => <article key={payment.id} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><h2 className="min-w-0 break-words text-lg font-semibold">{payment.course.title}</h2><span className={`rounded-full px-3 py-1 text-xs ${colors[payment.status]}`}>{labels[payment.status]}</span></div>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><dt className="text-slate-500">مبلغ</dt><dd className="mt-1 font-semibold">{payment.amount.toLocaleString("fa-IR")} تومان</dd></div>
            <div><dt className="text-slate-500">تاریخ درخواست</dt><dd className="mt-1">{date(payment.createdAt)}</dd></div>
            <div><dt className="text-slate-500">تاریخ پرداخت موفق</dt><dd className="mt-1">{payment.status === "SUCCESS" && payment.paidAt ? date(payment.paidAt) : "—"}</dd></div>
            <div><dt className="text-slate-500">شمارهٔ تراکنش</dt><dd className="mt-1 break-all"><bdi>{payment.status === "SUCCESS" ? payment.transactionId || "ثبت نشده" : "—"}</bdi></dd></div>
          </dl>
          {payment.status === "PENDING" && <p className="mt-4 text-xs leading-6 text-amber-800">تأیید نهایی این پرداخت هنوز ثبت نشده است. این وضعیت به‌تنهایی به معنی پرداخت موفق یا ناموفق نیست.</p>}
          <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4 text-sm">
            {payment.status === "SUCCESS" && <Link href={`/payment/success?paymentId=${payment.id}`} className="font-medium text-indigo-600 hover:underline">مشاهدهٔ رسید</Link>}
            {payment.course.status === "PUBLISHED" ? <Link href={`/courses/${payment.course.slug}`} className="text-slate-600 hover:text-indigo-600">مشاهدهٔ دوره</Link> : <span className="text-slate-500">دوره در حال حاضر منتشر نیست.</span>}
          </div>
        </article>)}</div>
      )}
      {pages > 1 && <nav aria-label="صفحه‌بندی پرداخت‌ها" className="mt-6 flex justify-center gap-5 text-sm">
        {page > 1 && <Link href={pageUrl(page - 1)} className="text-indigo-600">صفحهٔ قبل</Link>}
        <span>صفحهٔ {page.toLocaleString("fa-IR")} از {pages.toLocaleString("fa-IR")}</span>
        {page < pages && <Link href={pageUrl(page + 1)} className="text-indigo-600">صفحهٔ بعد</Link>}
      </nav>}
    </main>
  );
}
