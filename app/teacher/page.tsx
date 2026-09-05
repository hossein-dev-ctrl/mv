import Link from "next/link";
import LogoutButton from "@/components/logout-button";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export default async function TeacherPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "TEACHER" && session.role !== "ADMIN") {
    redirect("/dashboard");
  }

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
      <div className="flex gap-3">
        <LogoutButton />

        <Link
          href="/teacher/courses/new"
          className="rounded-xl bg-indigo-600 px-5 py-3 text-white"
        >
          + ایجاد دوره جدید
        </Link>
      </div>
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">پنل مدرس</h1>
            <p className="mt-2 text-gray-500">
              دوره‌های آموزشی خود را مدیریت کنید.
            </p>
          </div>

          <Link
            href="/teacher/courses/new"
            className="rounded-lg bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            + ایجاد دوره
          </Link>
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
              <Link
                key={course.id}
                href={`/teacher/courses/${course.id}`}
                className="overflow-hidden rounded-xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
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

                <div className="p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="font-bold">{course.title}</h2>

                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">
                      {course.status}
                    </span>
                  </div>

                  {course.shortDescription && (
                    <p className="line-clamp-2 text-sm text-gray-500">
                      {course.shortDescription}
                    </p>
                  )}

                  <div className="mt-5 flex gap-4 text-xs text-gray-500">
                    <span>{course._count.sections} فصل</span>

                    <span>{course._count.enrollments} دانشجو</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
