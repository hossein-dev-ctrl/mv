import DeliveryStatus from "@/components/course/delivery-status";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";

import CreateSectionForm from "@/components/teacher/create-section-form";
import ReorderSectionButtons from "@/components/teacher/reorder-section-buttons";
import DeleteCourseButton from "@/components/teacher/delete-course-button";
import CourseStatusButton from "@/components/teacher/course-status-button";
import DeleteSectionButton from "@/components/teacher/delete-section-button";

import { prisma } from "@/lib/prisma";
import { getManagementSession } from "@/lib/management-session";

type PageProps = {
  params: Promise<{
    courseId: string;
  }>;
};

export default async function CourseManagementPage({ params }: PageProps) {
  const session = await getManagementSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "TEACHER" && session.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { courseId } = await params;

  const course = await prisma.course.findUnique({
    where: {
      id: courseId,
      ...(session.role === "ADMIN" ? {} : { teacherId: session.userId }),
    },
    include: {
      sections: {
        orderBy: {
          order: "asc",
        },
        include: {
          lessons: {
            orderBy: {
              order: "asc",
            },
          },
        },
      },

      _count: {
        select: {
          sections: true,
          enrollments: true,
          payments: true,
        },
      },
    },
  });

  if (!course) {
    notFound();
  }

  // مدرس فقط دوره خودش را مدیریت کند
  if (session.role !== "ADMIN" && course.teacherId !== session.userId) {
    redirect("/teacher");
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-6 sm:p-8">
      <div className="mx-auto mb-5 grid max-w-7xl items-center gap-3 sm:grid-cols-[auto_1fr_1fr]"><DeliveryStatus status={course.deliveryStatus}/><Link href={`/teacher/courses/${course.id}/assignments`} className="panel-action panel-action-violet">تکلیف‌ها و ارزیابی</Link><Link href={`/teacher/courses/${course.id}/interests`} className="panel-action panel-action-amber">فهرست متقاضیان پیش‌ثبت‌نام</Link></div>
      <div className="mx-auto max-w-7xl">
        <nav aria-label="مسیر مدیریت دوره" className="mb-5">
          <Link href={session.role === "ADMIN" ? "/admin/courses" : "/teacher"} className="panel-action panel-action-slate">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="m14 6 6 6-6 6M20 12H4" /></svg>
            {session.role === "ADMIN" ? "بازگشت به همهٔ دوره‌ها" : "بازگشت به دوره‌های من"}
          </Link>
        </nav>
        <section aria-labelledby="course-heading" className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span className="text-xs font-medium text-slate-500">مدیریت دوره</span>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${course.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-700" : course.status === "ARCHIVED" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
                  {{ DRAFT: "پیش‌نویس", PUBLISHED: "منتشرشده", ARCHIVED: "آرشیوشده" }[course.status]}
                </span>
              </div>
              <h1 id="course-heading" className="break-words text-2xl font-bold leading-relaxed sm:text-3xl">{course.title}</h1>
              <p className="mt-2 text-sm text-slate-500">محتوا، انتشار و پیشرفت دانش‌آموزان را از اینجا مدیریت کنید.</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link href={`/teacher/courses/${course.id}/edit`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-indigo-700">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15v5Z" /></svg>
                ویرایش اطلاعات دوره
              </Link>
              {course.status === "PUBLISHED" && <Link href={`/courses/${course.slug}`} className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">مشاهدهٔ صفحهٔ دوره</Link>}
            </div>
          </div>
          <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/70 px-6 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
            <div><h2 className="text-sm font-semibold text-slate-700">تنظیمات انتشار</h2><p className="mt-1 text-xs leading-6 text-slate-500">فقط دورهٔ منتشرشده برای ثبت‌نام و یادگیری در دسترس است.</p></div>
            <CourseStatusButton courseId={course.id} status={course.status} />
          </div>
        </section>

        {/* اطلاعات دوره */}
        <div className="mb-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">وضعیت دوره</p>

            <p className="mt-2 text-xl font-bold">{{ DRAFT: "پیش‌نویس", PUBLISHED: "منتشرشده", ARCHIVED: "آرشیوشده" }[course.status]}</p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">تعداد فصل‌ها</p>

            <p className="mt-2 text-xl font-bold">{(course._count.sections).toLocaleString("fa-IR")}</p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">ثبت‌نام‌ها (همهٔ وضعیت‌ها)</p>

            <p className="mt-2 text-xl font-bold">
              {(course._count.enrollments).toLocaleString("fa-IR")}
            </p>
            <Link href={`/teacher/courses/${course.id}/students`} className="panel-action panel-action-teal mt-3">مشاهدهٔ دانش‌آموزان و پیشرفت</Link>
          </div>
        </div>

        {/* توضیحات */}
        <section className="mb-8 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold">توضیحات دوره</h2>

          <p className="leading-8 text-gray-600">
            {course.description || "توضیحی برای این دوره ثبت نشده است."}
          </p>
        </section>

        {/* نقشه راه */}
        <section className="mb-8 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold">🗺️ نقشه راه دوره</h2>

          {course.roadmapImageUrl ? (
            <img
              src={course.roadmapImageUrl}
              alt="نقشه راه دوره"
              className="mx-auto max-h-[600px] w-auto max-w-full rounded-xl object-contain"
            />
          ) : (
            <div className="rounded-xl border-2 border-dashed p-10 text-center text-gray-500">
              هنوز نقشه راهی برای این دوره بارگذاری نشده است.
            </div>
          )}
        </section>

        {/* محتوای آموزشی */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">📚 محتوای آموزشی</h2>

              <p className="mt-1 text-sm text-gray-500">
                فصل‌ها و درس‌های این دوره
              </p>
            </div>

            {/* اینجا دقیقاً جای CreateSectionForm است */}
            <CreateSectionForm courseId={course.id} />
          </div>

          {course.sections.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed p-10 text-center">
              <div className="text-4xl">📚</div>

              <h3 className="mt-3 font-semibold">هنوز فصلی ایجاد نشده است</h3>

              <p className="mt-2 text-sm text-gray-500">
                اولین فصل دوره را ایجاد کنید.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {course.sections.map((section, index) => (
                <div
                  key={section.id}
                  className="rounded-2xl border bg-white p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 font-bold text-indigo-600">
                        {(section.order).toLocaleString("fa-IR")}
                      </div>

                      <div>
                        <h2 className="font-bold">{section.title}</h2>

                        {section.description && (
                          <p className="mt-1 text-sm text-gray-500">
                            {section.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <ReorderSectionButtons
                        sectionId={section.id}
                        isFirst={index === 0}
                        isLast={index === course.sections.length - 1}
                      />

                      <Link
                        href={`/teacher/courses/${course.id}/sections/${section.id}`}
                        className="rounded-lg bg-indigo-50 px-4 py-2 text-sm text-indigo-600"
                      >
                        مدیریت فصل
                      </Link>
                      <DeleteSectionButton sectionId={section.id} />
                    </div>
                  </div>

                  <div className="mt-4 border-t pt-4">
                    {section.lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="flex items-center justify-between border-b py-3 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs">
                            {(lesson.order).toLocaleString("fa-IR")}
                          </span>

                          <span>{lesson.title}</span>
                        </div>

                        <span className="text-xs text-gray-400">
                          {lesson.status === "PUBLISHED"
                            ? "🟢 منتشر شده"
                            : "🟡 پیش‌نویس"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        {course._count.payments === 0 && <section aria-label="حذف دوره" className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-rose-100 bg-white p-6">
          <div><h2 className="text-sm font-semibold text-rose-700">حذف دائمی دوره</h2><p className="mt-1 text-xs leading-6 text-slate-500">دوره و اطلاعات وابسته حذف می‌شوند؛ این کار قابل بازگشت نیست.</p></div>
          <DeleteCourseButton courseId={course.id} />
        </section>}
      </div>
    </main>
  );
}
