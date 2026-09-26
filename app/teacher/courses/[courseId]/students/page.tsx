
import ThemeIcon from '@/components/panel/theme-icon';
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getLearningSummary } from "@/lib/student-dashboard";
import { getTeacherCourse, enrollmentLabels, parseStudentFilters, formatStudentDate } from "@/lib/teacher-students";

export default async function CourseStudentsPage({ params, searchParams }: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { courseId } = await params;
  const course = await getTeacherCourse(courseId);
  const { q, status, page: requestedPage } = parseStudentFilters(await searchParams);
  const where: Prisma.EnrollmentWhereInput = {
    courseId, ...(status ? { status } : {}),
    ...(q ? { user: { OR: [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ] } } : {}),
  };
  const total = await prisma.enrollment.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / 20));
  const page = Math.min(requestedPage, pageCount);
  const enrollments = await prisma.enrollment.findMany({
    where, orderBy: [{ enrolledAt: "desc" }, { id: "asc" }], skip: (page - 1) * 20, take: 20,
    select: {
      id: true, status: true, enrolledAt: true,
      user: { select: { name: true, email: true, phone: true } },
      progresses: { where: { lesson: { status: "PUBLISHED", section: { courseId } } },
        select: { lessonId: true, status: true, startedAt: true } },
    },
  });
  const lessons = course.sections.flatMap(section => section.lessons);
  const base = `/teacher/courses/${courseId}/students`;
  const pageUrl = (number: number) => {
    const query = new URLSearchParams({ page: String(number) });
    if (q) query.set("q", q);
    if (status) query.set("status", status);
    return `${base}?${query}`;
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <Link href={`/teacher/courses/${courseId}`} className="panel-action panel-action-indigo"><ThemeIcon name="arrow" className="me-2 h-4 w-4"/>← بازگشت به مدیریت دوره</Link>
      <h1 className="mt-4 text-2xl font-bold">دانش‌آموزان دورهٔ {course.title}</h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">پیشرفت بر اساس درس‌های منتشرشدهٔ فعلی محاسبه می‌شود. وضعیت ثبت‌نام جدا از پیشرفت آموزشی نمایش داده می‌شود.</p>
      <form action={base} className="mt-6 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="min-w-0 flex-1">
          <label htmlFor="student-search" className="mb-2 block text-sm font-medium">جست‌وجوی نام، ایمیل یا موبایل</label>
          <input id="student-search" name="q" defaultValue={q} maxLength={100} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label htmlFor="student-status" className="mb-2 block text-sm font-medium">وضعیت ثبت‌نام</label>
          <select id="student-status" name="status" defaultValue={status ?? ""} className="rounded-lg border border-slate-300 px-3 py-2">
            <option value="">همهٔ وضعیت‌ها</option>
            {Object.entries(enrollmentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <button type="submit" className="rounded-lg bg-indigo-600 px-5 py-2 text-white hover:bg-indigo-700"><ThemeIcon name="search" className="me-2 h-4 w-4"/>اعمال فیلتر</button>
        {(q || status) && <Link href={base} className="panel-action panel-action-indigo"><ThemeIcon name="search" className="me-2 h-4 w-4"/>پاک کردن فیلترها</Link>}
      </form>
      <p className="my-5 text-sm text-slate-600">{total.toLocaleString("fa-IR")} ثبت‌نام مطابق فیلتر</p>
      {enrollments.length === 0 ? (
        <p className="rounded-2xl border bg-white p-8 text-center text-slate-600">{q || status ? "نتیجه‌ای با این فیلترها پیدا نشد." : "هنوز کسی در این دوره ثبت‌نام نکرده است."}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-right text-sm">
            <caption className="sr-only">فهرست ثبت‌نام‌ها و پیشرفت دورهٔ {course.title}</caption>
            <thead className="bg-slate-100 text-slate-700"><tr>
              {['دانش‌آموز', 'تاریخ ثبت‌نام', 'وضعیت ثبت‌نام', 'پیشرفت آموزشی', 'جزئیات'].map(label => <th key={label} scope="col" className="p-4">{label}</th>)}
            </tr></thead>
            <tbody>{enrollments.map(enrollment => {
              const summary = getLearningSummary(lessons, enrollment.progresses, course.status);
              const name = enrollment.user.name?.trim() || enrollment.user.email || enrollment.user.phone || "کاربر بدون نام";
              return <tr key={enrollment.id} className="border-t border-slate-100">
                <th scope="row" className="p-4 font-medium"><bdi>{name}</bdi></th>
                <td className="p-4">{formatStudentDate(enrollment.enrolledAt)}</td>
                <td className="p-4">{enrollmentLabels[enrollment.status]}</td>
                <td className="p-4">
                  {lessons.length ? <><span>{summary.completedLessons.toLocaleString("fa-IR")} از {summary.totalLessons.toLocaleString("fa-IR")} درس · {summary.percentage.toLocaleString("fa-IR")}٪</span><progress aria-label={`پیشرفت ${name}`} value={summary.percentage} max={100} className="mt-2 block h-2 w-full accent-indigo-600" /></> : "بدون درس منتشرشده"}
                </td>
                <td className="p-4"><Link href={`${base}/${enrollment.id}`} aria-label={`جزئیات پیشرفت ${name}`} className="panel-action panel-action-indigo">مشاهدهٔ پیشرفت</Link></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      )}
      {pageCount > 1 && <nav aria-label="صفحه‌بندی دانش‌آموزان" className="mt-6 flex items-center justify-center gap-5 text-sm">
        {page > 1 && <Link href={pageUrl(page - 1)} className="panel-action panel-action-slate"><ThemeIcon name="arrow" className="me-2 h-4 w-4"/>صفحهٔ قبل</Link>}
        <span>صفحهٔ {page.toLocaleString("fa-IR")} از {pageCount.toLocaleString("fa-IR")}</span>
        {page < pageCount && <Link href={pageUrl(page + 1)} className="panel-action panel-action-slate"><ThemeIcon name="arrow" className="me-2 h-4 w-4"/>صفحهٔ بعد</Link>}
      </nav>}
    </main>
  );
}
