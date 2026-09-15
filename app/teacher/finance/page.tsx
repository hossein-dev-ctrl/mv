import Link from "next/link";
import { requireFinanceUser, getFinanceCourses, totalFinance } from "@/lib/finance";
import FinanceSummary from "@/components/finance/summary";

export default async function TeacherFinancePage() {
  const user = await requireFinanceUser();
  const courses = await getFinanceCourses(user.id);
  return <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
    <Link href="/teacher" className="text-sm text-indigo-600">بازگشت به دوره‌های من</Link>
    <h1 className="mt-4 text-2xl font-bold">گزارش مالی من</h1>
    <p className="mt-3 text-sm leading-7 text-slate-600">سهم فعلی شما: {user.teacherSharePercent === null ? "هنوز توسط مدیر تعیین نشده" : `${user.teacherSharePercent.toLocaleString("fa-IR")}٪`}. سهم هر پرداخت هنگام تأیید موفق ذخیره می‌شود.</p>
    <FinanceSummary totals={totalFinance(courses)} />
    <h2 className="my-5 text-lg font-bold">به تفکیک دوره</h2>
    {courses.length === 0 && <p className="rounded-xl border bg-white p-6">هنوز دوره‌ای ندارید.</p>}
    <div className="space-y-5">{courses.map(course => <section key={course.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="font-bold">{course.title}</h3><FinanceSummary totals={course.totals} />
      <Link href={`/teacher/courses/${course.id}/students`} className="text-sm text-indigo-600">مشاهدهٔ ثبت‌نام‌ها و پیشرفت</Link>
    </section>)}</div>
  </main>;
}
