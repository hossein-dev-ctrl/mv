
import ThemeIcon from '@/components/panel/theme-icon';
import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">پنل مدیر</h1>
      <p className="mt-3 leading-7 text-slate-600">گزارش‌های مالی، سهم مدرس‌ها و پیشرفت دانش‌آموزان را مدیریت کنید.</p>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <Link href="/admin/finance" className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6"><ThemeIcon name="edit" className="me-2 h-4 w-4"/><h2 className="text-lg font-bold text-indigo-700">مالی و سهم مدرس‌ها</h2><p className="mt-3 text-sm leading-7 text-slate-600">آمار کل و به تفکیک مدرس، فروش و تنظیم درصد سهم.</p></Link>
        <Link href="/admin/courses" className="rounded-2xl border border-slate-200 bg-white p-6"><ThemeIcon name="check" className="me-2 h-4 w-4"/><h2 className="text-lg font-bold text-indigo-700">پیشرفت دانش‌آموزان همهٔ دوره‌ها</h2><p className="mt-3 text-sm leading-7 text-slate-600">ورود به فهرست ثبت‌نام‌ها و گزارش درس‌های هر دانش‌آموز.</p></Link>
        <Link href="/admin/settlements" className="rounded-2xl border border-slate-200 bg-white p-6"><ThemeIcon name="wallet" className="me-2 h-4 w-4"/><h2 className="text-lg font-bold text-indigo-700">تسویه و بازپرداخت</h2><p className="mt-3 text-sm text-slate-600">درخواست برداشت، واریز، کارمزد و بازپرداخت مشتری.</p></Link>
        <Link href="/admin/users" className="rounded-2xl border bg-white p-6"><ThemeIcon name="users" className="me-2 h-4 w-4"/><h2 className="text-lg font-bold text-indigo-700">کاربران سایت</h2><p className="mt-3 text-sm">اطلاعات تماس، نقش و دوره‌های هر حساب.</p></Link>
        {process.env.NODE_ENV === "development" && <Link href="/admin/finance-demo" className="rounded-2xl border bg-amber-50 p-6"><ThemeIcon name="wallet" className="me-2 h-4 w-4"/>آزمایش مالی: ساخت و پاک‌سازی دادهٔ نمونه</Link>}
      </div>
    </main>
  );
}
