import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { calculateProgress } from "@/lib/course-progress";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId: session.userId,
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

              const totalLessons = lessons.length;

              const completedLessons = enrollment.progresses.filter(
                (progress) => progress.status === "COMPLETED",
              ).length;

              const percentage = calculateProgress(
                completedLessons,
                totalLessons,
              );

              // const progress =
              //   totalLessons > 0
              //     ? Math.round((completedLessons / totalLessons) * 100)
              //     : 0;

              const nextLesson = lessons.find((lesson) => {
                const lessonProgress = enrollment.progresses.find(
                  (item) => item.lessonId === lesson.id,
                );

                return lessonProgress?.status !== "COMPLETED";
              });

              return (
                <div
                  key={enrollment.id}
                  className="overflow-hidden rounded-2xl border bg-white shadow-sm"
                >
                  {/* تصویر */}

                  <div className="aspect-video bg-gray-100">
                    {enrollment.course.thumbnailUrl ? (
                      <img
                        src={enrollment.course.thumbnailUrl}
                        alt={enrollment.course.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-400">
                        بدون تصویر
                      </div>
                    )}
                  </div>

                  <div className="p-6">
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

                        <span className="font-bold">{percentage}٪</span>
                        {/* <span className="font-bold">{progress}٪</span> */}
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-indigo-600 transition-all"
                          // style={{
                          //   width: `${progress}%`,
                          // }}
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                        <span>
                          {completedLessons} از {totalLessons} درس
                        </span>

                        {/* <span>{progress}٪</span> */}
                        <span>{percentage}٪</span>
                      </div>
                    </div>

                    {/* ادامه یادگیری */}

                    <div className="mt-6">
                      {/* {nextLesson ? (
                        <Link
                          href={`/courses/${enrollment.course.slug}/lessons/${nextLesson.id}`}
                          className="block rounded-xl bg-indigo-600 px-5 py-3 text-center font-medium text-white hover:bg-indigo-700"
                        >
                          ▶️ ادامه یادگیری
                        </Link>
                      ) : (
                        <div className="rounded-xl bg-green-50 px-5 py-3 text-center font-medium text-green-700">
                          🎉 دوره را کامل کرده‌اید
                        </div>
                      )} */}
                      {enrollment.status === "COMPLETED" ? (
                        <div className="mt-6 rounded-xl bg-green-50 p-4 text-center font-medium text-green-700">
                          🎓 تبریک! این دوره را با موفقیت به پایان رساندید.
                        </div>
                      ) : nextLesson ? (
                        <Link
                          href={`/courses/${enrollment.course.slug}/lessons/${nextLesson.id}`}
                          className="mt-6 block rounded-xl bg-indigo-600 px-5 py-3 text-center font-medium text-white hover:bg-indigo-700"
                        >
                          ▶️ ادامه یادگیری
                        </Link>
                      ) : null}
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
