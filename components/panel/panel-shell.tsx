import Link from "next/link";
import Navigation from "@/components/panel/navigation";
import { panelNavigation } from "@/lib/panel-navigation";
import { redirect } from "next/navigation";
import { getSession, type UserRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LogoutButton from "@/components/logout-button";

type Area = "student" | "teacher" | "admin" | "lesson" | "courses" | "payments";
const roles: Record<UserRole, string> = {
  STUDENT: "دانش‌آموز", TEACHER: "مدرس", ADMIN: "مدیر",
};
const areas: Record<Area, string> = {
  payments: "سوابق پرداخت", courses: "دوره‌ها", student: "دوره‌های ثبت‌نام‌شده", teacher: "پنل مدرس", admin: "پنل مدیر", lesson: "محیط یادگیری",
};

export function Brand() {
  return (
    <span className="inline-flex items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white">
        <svg aria-hidden="true" viewBox="0 0 32 32" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 9c-4-3-8-3-12-2v18c4-1 8-1 12 2 4-3 8-3 12-2V7c-4-1-8-1-12 2Z" />
          <path d="M16 9v18M8 12l4 1M8 17l4 1M20 13l4-1M20 18l4-1" />
        </svg>
      </span>
      <span className="font-bold tracking-tight">آموزش آنلاین</span>
    </span>
  );
}

export default async function PanelShell({ children, area }: {
  children: React.ReactNode;
  area: Area;
}) {
  const session = await getSession();
  if (!session && area !== "courses") redirect("/login");

  const user = session ? await prisma.user.findUnique({
    where: { id: session.userId },
    select: { demoBatchId: true, name: true, email: true, phone: true, role: true },
  }) : null;
  // A changed role requires a fresh session so the displayed role and API
  // permissions cannot disagree. This layout does not replace API checks.
  if (session && (!user || user.role !== session.role || !(user.role in roles))) redirect("/login");
  if (user?.demoBatchId && process.env.NODE_ENV === "production") redirect("/login");
  if (area === "admin" && user?.role !== "ADMIN") redirect("/dashboard");
  if (area === "teacher" && (!user || user.role === "STUDENT")) redirect("/dashboard");

  const name = user?.name?.trim() || user?.email || user?.phone || "کاربر";
  const navigation = panelNavigation(user?.role);

  return (
    <div dir="rtl" className="flex min-h-screen flex-col bg-slate-50">
      <a href="#panel-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-lg focus:bg-white focus:p-4">
        رفتن به محتوای صفحه
      </a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-4 py-5 sm:px-6">
          <Link href="/courses" aria-label="آموزش آنلاین، مشاهدهٔ دوره‌ها" className="rounded-lg text-slate-900 focus-visible:outline-2 focus-visible:outline-indigo-600">
            <Brand />
          </Link>
          {user ? <div className="flex w-full min-w-0 items-center justify-between gap-3 sm:w-auto">
            <div className="flex min-w-0 items-center gap-3">
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-indigo-700">
                {Array.from(name)[0]}
              </span>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">کاربر واردشده</p>
                <p className="max-w-64 break-words text-sm font-semibold"><bdi>{name}</bdi></p>
                <p className="mt-1 text-xs text-indigo-700">سطح دسترسی: {roles[user.role]}</p>
              </div>
            </div>
            <LogoutButton />
          </div> : <Link href="/login" className="rounded-xl bg-indigo-600 px-5 py-3 text-sm text-white">ورود به حساب کاربری</Link>}
        </div>
        <div className="panel-tabs">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Navigation items={navigation} role={user?.role} />
            <span className="text-xs text-slate-500">بخش فعلی: {areas[area]}</span>
          </div>
        </div>
      </header>

      <div id="panel-content" tabIndex={-1} className="flex-1 outline-none [&>main]:min-h-0">
        {user?.demoBatchId && <p className="bg-amber-100 p-4 text-center text-sm">حساب آزمایشی؛ مبالغ این حساب واقعی نیست و نباید انتقال بانکی انجام شود.</p>}
        {children}
      </div>

      <footer className="panel-footer">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:grid-cols-2 sm:px-6">
          <div>
            <Link href="/courses" className="inline-block text-slate-900"><Brand /></Link>
            <p className="mt-3 text-sm leading-7 text-slate-500">دوره‌ها، درس‌ها و مسیر یادگیری شما در یک جا.</p>
          </div>
          <nav aria-label="دسترسی سریع پایین صفحه" className="flex flex-wrap content-center items-center gap-x-5 gap-y-3 text-sm text-slate-600 sm:justify-end">
            {navigation.map((item) => <Link key={item.href} href={item.href} className="hover:text-indigo-700 hover:underline">{item.label}</Link>)}
          </nav>
        </div>
        <div className="border-t border-slate-100 px-4 py-4 text-center text-xs leading-6 text-slate-500">
          © {new Date().getFullYear().toLocaleString("fa-IR", { useGrouping: false })} آموزش آنلاین — کلیهٔ حقوق محفوظ است.
        </div>
      </footer>
    </div>
  );
}
