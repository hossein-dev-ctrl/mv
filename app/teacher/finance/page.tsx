import { prisma } from "@/lib/prisma";
import { readWallet } from "@/lib/wallet";
import WalletSummary from "@/components/finance/wallet-summary";
import LedgerForm from "@/components/finance/ledger-form";
import PayoutCard from "@/components/finance/payout-card";
import FinancialChart from "@/components/finance/financial-chart";
import Link from "next/link";
import { requireFinanceUser, getFinanceCourses, totalFinance } from "@/lib/finance";
import FinanceSummary from "@/components/finance/summary";

export default async function TeacherFinancePage() {
  const user = await requireFinanceUser();
  const courses = await getFinanceCourses(user.id);
  const wallet = await readWallet(user.id);
  const settings = await prisma.financeSettings.findUnique({where:{id:"main"}});
  const minimum = settings?.minimumPayout;
  const open = wallet.payouts.some(p=>["REQUESTED","PROCESSING"].includes(p.status));
  const eligible = !!minimum && wallet.totals.available >= minimum && !open;

  return <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
    <Link href="/teacher" className="text-sm text-indigo-600">بازگشت به دوره‌های من</Link>
    <h1 className="mt-4 text-2xl font-bold">گزارش مالی من</h1>
    <p className="mt-3 text-sm leading-7 text-slate-600">سهم فعلی شما: {user.teacherSharePercent === null ? "هنوز توسط مدیر تعیین نشده" : `${user.teacherSharePercent.toLocaleString("fa-IR")}٪`}. سهم هر پرداخت هنگام تأیید موفق ذخیره می‌شود.</p>
    <WalletSummary totals={wallet.totals} />
    <section className="rounded-2xl border border-indigo-200 bg-white p-5">
      <h2 className="font-bold">درخواست واریز درآمد</h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">حداقل برداشت: {minimum ? `${minimum.toLocaleString("fa-IR")} تومان` : "هنوز توسط مدیر تعیین نشده"}. مبلغ درخواستی تا رسیدگی رزرو می‌شود. تسویه‌های قبلی از مانده کسر شده‌اند.</p>
      {open && <p className="mt-2 text-sm text-amber-800">یک درخواست باز دارید؛ منتظر رسیدگی مدیر بمانید.</p>}
      {wallet.totals.available<0 && <p className="mt-2 text-sm text-rose-700">پس از بازپرداخت، مانده بدهکار شده است؛ درآمد بعدی ابتدا این بدهی را پوشش می‌دهد.</p>}
      {!eligible&&!open&&minimum&&wallet.totals.available>=0&&<p className="mt-2 text-sm text-slate-500">هنوز به حداقل برداشت نرسیده‌اید.</p>}
      {eligible && <LedgerForm action="request" label="درخواست واریز وجه" fields={[{name:"amount",label:"مبلغ برداشت (تومان)",type:"number",value:Math.min(wallet.totals.available,2000000000),min:minimum!,max:Math.min(wallet.totals.available,2000000000)},{name:"iban",label:"شماره شبا IR…"},{name:"accountName",label:"نام صاحب حساب"}]} />}
    </section>
    <FinancialChart sales={wallet.sales} payouts={wallet.payouts} />
    <h2 className="my-5 text-lg font-bold">سابقهٔ درخواست و دریافت وجه</h2>
    <p className="mb-4 text-xs leading-7 text-slate-500">تاریخ مبنا زمان محاسبهٔ ماندهٔ درخواست است؛ برداشت جزئی به معنی تسویهٔ کامل درآمد تا آن تاریخ نیست. مبلغ هر درخواست و ماندهٔ باقی‌مانده ملاک هستند.</p>
    <div className="space-y-4">{wallet.payouts.map(payout=><PayoutCard key={payout.id} payout={payout} />)}{wallet.payouts.length===0&&<p className="rounded-xl border bg-white p-5 text-sm">هنوز درخواست برداشتی ثبت نشده است.</p>}</div>
    <details className="mt-8"><summary className="cursor-pointer font-bold">آمار ناخالص ثبت‌نام و فروش</summary><FinanceSummary totals={totalFinance(courses)} /></details>
    <h2 className="my-5 text-lg font-bold">به تفکیک دوره</h2>
    {courses.length === 0 && <p className="rounded-xl border bg-white p-6">هنوز دوره‌ای ندارید.</p>}
    <div className="space-y-5">{courses.map(course => <section key={course.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="font-bold">{course.title}</h3><FinanceSummary totals={course.totals} />
      <Link href={`/teacher/courses/${course.id}/students`} className="text-sm text-indigo-600">مشاهدهٔ ثبت‌نام‌ها و پیشرفت</Link>
    </section>)}</div>
  </main>;
}
