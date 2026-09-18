import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getLearningSummary } from "@/lib/student-dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login?redirect=/dashboard");
  }

  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId: session.userId,
      course: { teacherId: { not: session.userId } },
      status: {
        in: ["ACTIVE", "COMPLETED"],
      },
    },

    include: {
      course: {
        include: {
          sections: {
            orderBy: {
              order: "asc",
            },

            include: {
              lessons: {
                where: {
                  status: "PUBLISHED",
                },

                orderBy: {
                  order: "asc",
                },
              },
            },
          },
        },
      },

      progresses: true,
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main dir="rtl" className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">داشبورد من</h1>

          <p className="mt-2 text-gray-500">
            دوره‌های آموزشی و میزان پیشرفت خود را مشاهده کنید.
          </p>
        </div>

        {enrollments.length === 0 ? (
          <div className="rounded-2xl border bg-white p-12 text-center shadow-sm">
            <div className="text-5xl">📚</div>

            <h2 className="mt-4 text-xl font-bold">
              هنوز در دوره‌ای ثبت‌نام نکرده‌اید
            </h2>

            <p className="mt-2 text-gray-500">
              یک دوره انتخاب کنید و یادگیری را شروع کنید.
            </p>

            <Link
              href="/courses"
              className="mt-6 inline-block rounded-xl bg-indigo-600 px-6 py-3 text-white"
            >
              مشاهده دوره‌ها
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {enrollments.map((enrollment) => {
              const lessons = enrollment.course.sections.flatMap(
                (section) => section.lessons,
              );

              const { totalLessons, completedLessons, percentage, nextLesson,
                state, hasStarted } = getLearningSummary(
                  lessons, enrollment.progresses, enrollment.course.status,
                );
              const statusLabels = {
                unavailable: "فعلاً در دسترس نیست",
                empty: "در انتظار انتشار درس",
                completed: "تکمیل‌شده",
                "in-progress": "در حال یادگیری",
                "not-started": "آمادهٔ شروع",
              };

              return (
                <div
                  key={enrollment.id}
                  className="overflow-hidden rounded-2xl border bg-white shadow-sm"
                >
                  {/* تصویر */}

                  <div className="aspect-video bg-gray-100">
                    {enrollment.course.thumbnailUrl ? (
                      // Course thumbnails may be hosted on teacher-provided domains.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={enrollment.course.thumbnailUrl}
                        alt={enrollment.course.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-400">
                        بدون تصویر
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <span className={`mb-3 inline-block rounded-full px-3 py-1 text-xs font-medium ${
                      state === "completed" ? "bg-green-50 text-green-700" : "bg-indigo-50 text-indigo-700"
                    }`}>
                      {statusLabels[state]}
                    </span>
                    <h2 className="text-xl font-bold">
                      {enrollment.course.title}
                    </h2>

                    {enrollment.course.shortDescription && (
                      <p className="mt-2 line-clamp-2 text-sm text-gray-500">
                        {enrollment.course.shortDescription}
                      </p>
                    )}

                    {/* Progress */}

                    <div className="mt-6">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-gray-600">پیشرفت دوره</span>

                        <span className="font-bold">{percentage.toLocaleString("fa-IR")}٪</span>
                      </div>

                      <div
                        role="progressbar"
                        aria-label={`پیشرفت ${enrollment.course.title}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={percentage}
                        className="h-3 overflow-hidden rounded-full bg-gray-200"
                      >
                        <div
                          className="h-full rounded-full bg-indigo-600 transition-all"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                        <span>
                          {completedLessons.toLocaleString("fa-IR")} از {totalLessons.toLocaleString("fa-IR")} درس تکمیل شده
                        </span>
                      </div>
                    </div>

                    <Link href={`/dashboard/courses/${enrollment.courseId}/grades`} className="panel-action panel-action-indigo mt-4">کارنامهٔ تکلیف‌ها</Link>
                    {/* ادامه یادگیری */}

                    <div className="mt-6">
                      {state === "completed" ? (
                        <div className="rounded-xl bg-green-50 p-4 text-center font-medium text-green-700">
                          تبریک! همهٔ درس‌های منتشرشدهٔ این دوره را تکمیل کرده‌اید.
                        </div>
                      ) : nextLesson ? (
                        <>
                          <p className="mb-3 text-sm leading-6 text-gray-600">
                            درس بعدی: {nextLesson.title}
                          </p>
                          <Link
                            href={`/courses/${enrollment.course.slug}/lessons/${nextLesson.id}`}
                            className="block rounded-xl bg-indigo-600 px-5 py-3 text-center font-medium text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                          >
                            {hasStarted ? "ادامهٔ یادگیری" : "شروع یادگیری"}
                          </Link>
                        </>
                      ) : (
                        <p className="rounded-xl bg-gray-50 p-4 text-sm leading-7 text-gray-600">
                          {state === "empty"
                            ? "هنوز درسی برای این دوره منتشر نشده است. پس از انتشار، می‌توانید یادگیری را شروع کنید."
                            : "این دوره در حال حاضر قابل مشاهده نیست. ثبت‌نام و پیشرفت شما حفظ شده است."}
                        </p>
                      )}
                      {enrollment.course.status === "PUBLISHED" && (
                        <Link
                          href={`/courses/${enrollment.course.slug}`}
                          className="panel-action panel-action-indigo mt-4"
                        >
                          {state === "completed" ? "مرور درس‌های دوره" : "مشاهدهٔ محتوای دوره"}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
