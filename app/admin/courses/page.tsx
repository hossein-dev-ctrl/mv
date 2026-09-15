import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireFinanceUser } from "@/lib/finance";

export default async function AdminCoursesPage() {
  await requireFinanceUser(true);
  const courses = await prisma.course.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, title: true, status: true, teacher: { select: { name: true } }, _count: { select: { enrollments: true } } } });
  return <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
    <Link href="/admin" className="text-sm text-indigo-600">بازگشت به پنل مدیر</Link><h1 className="my-5 text-2xl font-bold">دوره‌ها و پیشرفت دانش‌آموزان</h1>
    {courses.length === 0 && <p>هنوز دوره‌ای ایجاد نشده است.</p>}
    <div className="grid gap-4 sm:grid-cols-2">{courses.map(course => <article key={course.id} className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="font-bold">{course.title}</h2><p className="my-3 text-sm text-slate-500">مدرس: {course.teacher.name || "بدون نام"} · ثبت‌نام‌ها: {course._count.enrollments.toLocaleString("fa-IR")}</p>
      <div className="flex flex-wrap gap-4 text-sm"><Link href={`/teacher/courses/${course.id}/students`} className="font-medium text-indigo-600">مشاهدهٔ پیشرفت دانش‌آموزان</Link><Link href={`/teacher/courses/${course.id}`} className="text-slate-600">مدیریت دوره</Link></div>
    </article>)}</div>
  </main>;
}
