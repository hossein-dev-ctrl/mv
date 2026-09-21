import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getManagementSession } from "@/lib/management-session";

export default async function TeacherPage() {
  const session = await getManagementSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "TEACHER" && session.role !== "ADMIN") {
    redirect("/dashboard");
  }

  if (session.role === "ADMIN") redirect("/admin/courses");

  const courses = await prisma.course.findMany({
    where: {
      teacherId: session.userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: {
          sections: true,
          enrollments: true,
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h1 className="text-3xl font-bold">پنل مدرس</h1>
            <p className="mt-2 text-gray-500">
              فقط دوره‌های خودتان، پیشرفت دانش‌آموزان آن‌ها و پاسخ تکلیف‌هایشان در این پنل نمایش داده می‌شود.
            </p>
          </div>

          <div className="panel-actions shrink-0">
          <Link href="/teacher/finance" className="rounded-xl border border-slate-200 px-5 py-3 text-sm text-slate-600 hover:bg-slate-50">گزارش مالی من</Link>
          <Link
            href="/teacher/courses/new"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            + ایجاد دوره
          </Link>
          </div>
        </div>

        {courses.length === 0 ? (
          <div className="rounded-xl border bg-white p-12 text-center shadow-sm">
            <h2 className="text-xl font-semibold">
              هنوز دوره‌ای ایجاد نکرده‌اید
            </h2>

            <p className="mt-2 text-gray-500">
              اولین دوره آموزشی خود را ایجاد کنید.
            </p>

            <Link
              href="/teacher/courses/new"
              className="mt-6 inline-flex rounded-lg bg-black px-5 py-3 text-sm font-medium text-white"
            >
              ایجاد اولین دوره
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <article
                key={course.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="aspect-video bg-gray-100">
                  {course.thumbnailUrl ? (
                    <img
                      src={course.thumbnailUrl}
                      alt={course.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-400">
                      بدون تصویر
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="font-bold">{course.title}</h2>

                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">
                      {{ DRAFT: "پیش‌نویس", PUBLISHED: "منتشرشده", ARCHIVED: "آرشیوشده" }[course.status]}
                    </span>
                  </div>

                  {course.shortDescription && (
                    <p className="line-clamp-2 text-sm text-gray-500">
                      {course.shortDescription}
                    </p>
                  )}

                  <div className="mt-auto flex gap-4 pt-5 text-xs text-gray-500">
                    <span>{(course._count.sections).toLocaleString("fa-IR")} فصل</span>

                    <span>{(course._count.enrollments).toLocaleString("fa-IR")} دانشجو</span>
                  </div>
                  <div className="panel-actions mt-5">
                    <Link href={`/teacher/courses/${course.id}`} className="panel-action">مدیریت دوره</Link>
                    <Link href={`/teacher/courses/${course.id}/students`} className="panel-action panel-action-teal">پیشرفت دانش‌آموزان</Link>
                    <Link href={`/teacher/courses/${course.id}/assignments`} className="panel-action panel-action-violet">تکلیف‌ها و ارزیابی</Link>
                    <Link href={`/teacher/courses/${course.id}/interests`} className="panel-action panel-action-amber">متقاضیان دوره</Link>
                    {course.status === "PUBLISHED" && <Link href={`/courses/${course.slug}`} className="panel-action panel-action-slate">مشاهده از دید کاربر</Link>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
