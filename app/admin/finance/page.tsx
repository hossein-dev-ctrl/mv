import { readWallet } from "@/lib/wallet";
import { walletTotals } from "@/lib/wallet-math";
import WalletSummary from "@/components/finance/wallet-summary";
import FinancialChart from "@/components/finance/financial-chart";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireFinanceUser, getFinanceCourses, totalFinance } from "@/lib/finance";
import FinanceSummary from "@/components/finance/summary";
import ShareForm from "@/components/finance/share-form";

export default async function AdminFinancePage() {
  await requireFinanceUser(true);
  const courses = await getFinanceCourses();
  const teachers = await prisma.user.findMany({ where: { role: "TEACHER" }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, phone: true, teacherSharePercent: true } });
  const wallets = await Promise.all(teachers.map(teacher=>readWallet(teacher.id)));
  const globalWallet = await readWallet(undefined);
  const {sales,payouts} = globalWallet;
  return <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
    <Link href="/admin" className="text-sm text-indigo-600">بازگشت به پنل مدیر</Link>
    <h1 className="mt-4 text-2xl font-bold">مالی و سهم مدرس‌ها</h1>
    <Link href="/admin/settlements" className="mt-5 inline-block rounded-xl bg-indigo-600 px-5 py-3 text-sm text-white">مدیریت برداشت‌ها، بازپرداخت و کارمزد</Link>
    <WalletSummary totals={walletTotals(sales,payouts)} />
    <FinancialChart sales={sales} payouts={payouts} />
    <details className="my-6"><summary className="cursor-pointer font-bold">آمار ناخالص کل دوره‌ها</summary><FinanceSummary totals={totalFinance(courses)} /></details>
    <p className="my-6 rounded-xl border border-indigo-100 bg-indigo-50 p-5 text-sm leading-8 text-indigo-900">درصد سهم هر مدرس را از صفر تا صد تعیین کنید. تغییر درصد برای پرداخت‌های بعدی است. برای تعیین سهم پرداخت‌های قبلیِ بدون سهم، گزینهٔ مربوط را انتخاب کنید. سهم‌های قبلاً ثبت‌شده بازنویسی نمی‌شوند. سهم بر مبلغ پرداخت و با گرد کردن رو به پایین به تومان محاسبه می‌شود.</p>
    <h2 className="mb-5 text-xl font-bold">آمار به تفکیک مدرس</h2>
    {teachers.length === 0 && <p>هنوز مدرسی ثبت نشده است.</p>}
    <div className="space-y-6">{teachers.map((teacher,index) => {
      const owned = courses.filter(course => course.teacherId === teacher.id);
      return <section key={teacher.id} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h3 className="text-lg font-bold"><bdi>{teacher.name || teacher.email || teacher.phone || "مدرس بدون نام"}</bdi></h3>
        <p className="mt-2 text-sm text-slate-500">{owned.length.toLocaleString("fa-IR")} دوره · سهم فعلی: {teacher.teacherSharePercent === null ? "تعیین نشده" : `${teacher.teacherSharePercent.toLocaleString("fa-IR")}٪`}</p>
        <WalletSummary totals={wallets[index].totals} />
        <details><summary className="cursor-pointer text-sm">ثبت‌نام‌ها و فروش ناخالص</summary><FinanceSummary totals={totalFinance(owned)} /></details>
        <div className="flex flex-wrap gap-3">{owned.map(course => <Link key={course.id} href={`/teacher/courses/${course.id}/students`} className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-indigo-700">پیشرفت دانش‌آموزان: {course.title}</Link>)}</div>
        <ShareForm teacherId={teacher.id} percent={teacher.teacherSharePercent} />
      </section>;
    })}</div>
  </main>;
}
