import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">پنل مدیر</h1>
      <p className="mt-3 leading-7 text-slate-600">از اینجا به بخش‌های آموزشی حساب خود دسترسی دارید.</p>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <Link href="/teacher" className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-indigo-300 hover:shadow-sm">
          <h2 className="text-lg font-bold text-indigo-700">مدیریت دوره‌های من</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">ایجاد دوره و مدیریت فصل‌ها، درس‌ها و فایل‌های دوره‌هایی که مدرس آن‌ها هستید.</p>
        </Link>
        <Link href="/dashboard" className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-indigo-300 hover:shadow-sm">
          <h2 className="text-lg font-bold text-indigo-700">یادگیری من</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">مشاهدهٔ دوره‌های ثبت‌نام‌شده و ادامهٔ یادگیری.</p>
        </Link>
      </div>
    </main>
  );
}
