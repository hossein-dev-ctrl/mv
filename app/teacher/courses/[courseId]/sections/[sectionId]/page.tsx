import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

import CreateLessonForm from "@/components/teacher/create-lesson-form";
import LogoutButton from "@/components/logout-button";
import DeleteLessonButton from "@/components/teacher/delete-lesson-button";
import ReorderLessonButtons from "@/components/teacher/reorder-lesson-buttons";
type PageProps = {
  params: Promise<{
    courseId: string;
    sectionId: string;
  }>;
};

export default async function SectionPage({ params }: PageProps) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "TEACHER" && session.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { courseId, sectionId } = await params;

  const section = await prisma.courseSection.findFirst({
    where: {
      id: sectionId,
      courseId,
    },
    include: {
      course: true,
      lessons: {
        orderBy: {
          order: "asc",
        },
      },
    },
  });

  if (!section) {
    notFound();
  }

  if (session.role !== "ADMIN" && section.course.teacherId !== session.userId) {
    redirect("/teacher");
  }

  return (
    <main dir="rtl" className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link
              href={`/teacher/courses/${courseId}`}
              className="text-sm text-indigo-600"
            >
              ← بازگشت به دوره
            </Link>

            <p className="mt-4 text-sm text-gray-400">{section.course.title}</p>

            <h1 className="mt-2 text-3xl font-bold">{section.title}</h1>

            {section.description && (
              <p className="mt-2 text-gray-500">{section.description}</p>
            )}
          </div>

          <LogoutButton />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-xl font-bold">📚 درس‌های این فصل</h2>

              {section.lessons.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed p-10 text-center text-gray-400">
                  هنوز درسی ایجاد نشده است.
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                  {section.lessons.map((lesson, index) => (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between rounded-xl border p-4 transition hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 font-bold text-indigo-600">
                          {lesson.order}
                        </div>

                        <div>
                          <h3 className="font-semibold">{lesson.title}</h3>

                          <p className="mt-1 text-xs text-gray-400">
                            {lesson.status === "PUBLISHED"
                              ? "🟢 منتشر شده"
                              : "🟡 پیش‌نویس"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <ReorderLessonButtons
                          lessonId={lesson.id}
                          isFirst={index === 0}
                          isLast={index === section.lessons.length - 1}
                        />

                        <Link
                          href={`/teacher/courses/${courseId}/sections/${sectionId}/lessons/${lesson.id}`}
                          className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-600"
                        >
                          مدیریت
                        </Link>

                        <DeleteLessonButton lessonId={lesson.id} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <CreateLessonForm courseId={courseId} sectionId={sectionId} />
        </div>
      </div>
    </main>
  );
}
