import Link from "next/link";
import { redirect, notFound } from "next/navigation";

import LogoutButton from "@/components/logout-button";
import CreateSectionForm from "@/components/teacher/create-section-form";
import ReorderSectionButtons from "@/components/teacher/reorder-section-buttons";
import DeleteCourseButton from "@/components/teacher/delete-course-button";
import CourseStatusButton from "@/components/teacher/course-status-button";
import DeleteSectionButton from "@/components/teacher/delete-section-button";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type PageProps = {
  params: Promise<{
    courseId: string;
  }>;
};

export default async function CourseManagementPage({ params }: PageProps) {
  const session = await getSession();

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
    <main dir="rtl" className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link
              href="/teacher"
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              ← بازگشت به پنل مدرس
            </Link>

            <h1 className="mt-3 text-3xl font-bold">{course.title}</h1>

            <p className="mt-2 text-gray-500">مدیریت محتوای دوره</p>
          </div>
          <Link
            href={`/teacher/courses/${course.id}/edit`}
            className="rounded-xl bg-indigo-600 px-4 py-3 text-sm text-white"
          >
            ✏️ ویرایش دوره
          </Link>
          <CourseStatusButton courseId={course.id} status={course.status} />
          {course._count.payments === 0 && (
            <DeleteCourseButton courseId={course.id} />
          )}
          <LogoutButton />
        </div>

        {/* اطلاعات دوره */}
        <div className="mb-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">وضعیت دوره</p>

            <p className="mt-2 text-xl font-bold">{course.status}</p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">تعداد فصل‌ها</p>

            <p className="mt-2 text-xl font-bold">{course._count.sections}</p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">دانشجویان</p>

            <p className="mt-2 text-xl font-bold">
              {course._count.enrollments}
            </p>
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
              className="max-h-[600px] w-full rounded-xl object-contain"
            />
          ) : (
            <div className="rounded-xl border-2 border-dashed p-10 text-center text-gray-500">
              هنوز نقشه راهی برای این دوره بارگذاری نشده است.
            </div>
          )}
        </section>

        {/* محتوای آموزشی */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 font-bold text-indigo-600">
                        {section.order}
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

                    <div className="flex items-center gap-2">
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
                            {lesson.order}
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
      </div>
    </main>
  );
}
