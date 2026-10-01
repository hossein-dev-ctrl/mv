import {devTestingEnabled} from '@/lib/dev-test-policy';

import ThemeIcon from '@/components/panel/theme-icon';
import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">پنل مدیر</h1>
      <p className="mt-3 leading-7 text-slate-600">گزارش‌های مالی، سهم مدرس‌ها و پیشرفت دانش‌آموزان را مدیریت کنید.</p>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <Link href="/admin/certificates" className="rounded-2xl border border-violet-200 bg-violet-50 p-6"><ThemeIcon name="award" className="mb-3 h-7 w-7"/><h2 className="text-lg font-bold text-indigo-800">مرکز مدارک و گواهی‌نامه‌ها</h2><p className="mt-3 text-sm leading-7">صدور مدرک برای دانش‌آموز، مشاهده، استعلام و ابطال.</p></Link>
        <Link href="/admin/certificates/templates" className="rounded-2xl border border-sky-200 bg-sky-50 p-6"><ThemeIcon name="layers" className="mb-3 h-7 w-7"/><h2 className="text-lg font-bold text-indigo-800">طراحی و انتخاب قالب مدرک</h2><p className="mt-3 text-sm leading-7">چند قالب با پیش‌نمایش زنده؛ انتخاب مستقل برای هر دوره.</p></Link>
        {process.env.NODE_ENV==='development'&&<section className="rounded-2xl border border-amber-200 bg-amber-50 p-6"><h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><ThemeIcon name="users"/>تست با نقش‌های مختلف</h2>{devTestingEnabled()?<Link className="panel-action" href="/admin/testing">ورود به ابزار حساب‌های آزمایشی</Link>:<p className="text-sm leading-8">برای فعال‌سازی، در فایل محیط مقدار <bdi>DEV_TEST_USERS_ENABLED=true</bdi> را قرار دهید و سرور توسعه را دوباره اجرا کنید.</p>}</section>}

        <Link href="/admin/finance" className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6"><ThemeIcon name="edit" className="me-2 h-4 w-4"/><h2 className="text-lg font-bold text-indigo-700">مالی و سهم مدرس‌ها</h2><p className="mt-3 text-sm leading-7 text-slate-600">آمار کل و به تفکیک مدرس، فروش و تنظیم درصد سهم.</p></Link>
        <Link href="/admin/courses" className="rounded-2xl border border-slate-200 bg-white p-6"><ThemeIcon name="check" className="me-2 h-4 w-4"/><h2 className="text-lg font-bold text-indigo-700">پیشرفت دانش‌آموزان همهٔ دوره‌ها</h2><p className="mt-3 text-sm leading-7 text-slate-600">ورود به فهرست ثبت‌نام‌ها و گزارش درس‌های هر دانش‌آموز.</p></Link>
        <Link href="/admin/settlements" className="rounded-2xl border border-slate-200 bg-white p-6"><ThemeIcon name="wallet" className="me-2 h-4 w-4"/><h2 className="text-lg font-bold text-indigo-700">تسویه و بازپرداخت</h2><p className="mt-3 text-sm text-slate-600">درخواست برداشت، واریز، کارمزد و بازپرداخت مشتری.</p></Link>
        <Link href="/admin/users" className="rounded-2xl border bg-white p-6"><ThemeIcon name="users" className="me-2 h-4 w-4"/><h2 className="text-lg font-bold text-indigo-700">کاربران سایت</h2><p className="mt-3 text-sm">اطلاعات تماس، نقش و دوره‌های هر حساب.</p></Link>
        {process.env.NODE_ENV === "development" && <Link href="/admin/finance-demo" className="rounded-2xl border bg-amber-50 p-6"><ThemeIcon name="wallet" className="me-2 h-4 w-4"/>آزمایش مالی: ساخت و پاک‌سازی دادهٔ نمونه</Link>}
      </div>
    </main>
  );
}
