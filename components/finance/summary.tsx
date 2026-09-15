import type { summarizeFinance } from "@/lib/finance-math";
export default function FinanceSummary({ totals }: { totals: ReturnType<typeof summarizeFinance> }) {
  const items = [
    ["کل ثبت‌نام‌ها", totals.registrations, ""], ["ثبت‌نام دارای دسترسی", totals.active, ""],
    ["ثبت‌نام لغوشده", totals.cancelled, ""], ["فروش ناخالص واقعی", totals.sales, "تومان"],
    ["سهم ناخالص مدرس", totals.teacherShare, "تومان"], ["سهم ناخالص پلتفرم", totals.platformShare, "تومان"],
  ] as const;
  return <>
    <dl className="my-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(([label, value, unit]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-3 text-xl font-bold">{value.toLocaleString("fa-IR")} <span className="text-xs font-normal">{unit}</span></dd></div>)}</dl>
    {totals.unallocatedCount > 0 && <p className="mb-4 rounded-xl bg-amber-50 p-4 text-sm leading-7 text-amber-900">سهم {totals.unallocatedCount.toLocaleString("fa-IR")} پرداخت به مبلغ {totals.unallocated.toLocaleString("fa-IR")} تومان هنوز تعیین نشده و در سهم‌های بالا حساب نشده است.</p>}
    <p className="mb-4 text-xs leading-7 text-slate-500">پرداخت آزمایشی موفق: {totals.testPayments.toLocaleString("fa-IR")} مورد، {totals.testSales.toLocaleString("fa-IR")} تومان؛ خارج از فروش واقعی. ثبت‌نام رایگان در تعداد ثبت‌نام حساب می‌شود. این بخش آمار ناخالص فروش است؛ ماندهٔ قابل برداشت، بازپرداخت و کارمزد در دفتر تسویه نمایش داده می‌شود.</p>
    {totals.unknownPayments > 0 && <p className="mb-4 rounded-xl bg-amber-50 p-4 text-sm leading-7 text-amber-900">نوع {totals.unknownPayments.toLocaleString("fa-IR")} پرداخت قدیمی به مبلغ {totals.unknownSales.toLocaleString("fa-IR")} تومان مشخص نیست؛ برای جلوگیری از شمارش پرداخت آزمایشی به‌عنوان فروش، در فروش واقعی حساب نشده‌اند.</p>}
    {totals.selfRegistrations > 0 && <p className="mb-4 text-xs text-slate-500">{totals.selfRegistrations.toLocaleString("fa-IR")} ثبت‌نام قدیمی صاحب دوره از آمار کنار گذاشته شده است.</p>}
  </>;
}
