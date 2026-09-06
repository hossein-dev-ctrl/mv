import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CoursePage({ params }: Props) {
  const { slug } = await params;

  const session = await getSession();

  const course = await prisma.course.findUnique({
    where: {
      slug,
    },

    include: {
      teacher: {
        select: {
          name: true,
        },
      },

      sections: {
        orderBy: {
          order: "asc",
        },

        include: {
          lessons: {
            orderBy: {
              order: "asc",
            },

            select: {
              id: true,
              title: true,
              description: true,
              videoDuration: true,
              status: true,
              order: true,
            },
          },
        },
      },
    },
  });

  if (!course || course.status !== "PUBLISHED") {
    notFound();
  }

  let enrollment = null;

  if (session) {
    enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId: course.id,
        },
      },

      include: {
        progresses: true,
      },
    });
  }

  const isEnrolled =
    enrollment?.status === "ACTIVE" || enrollment?.status === "COMPLETED";

  /*
   * تمام Lessonهای منتشرشده
   */

  const lessons = course.sections.flatMap((section) =>
    section.lessons.filter((lesson) => lesson.status === "PUBLISHED"),
  );

  /*
   * تعیین درس‌های باز
   */

  const unlockedLessonIds = new Set<string>();

  if (isEnrolled) {
    for (let i = 0; i < lessons.length; i++) {
      // اولین درس همیشه باز است
      if (i === 0) {
        unlockedLessonIds.add(lessons[i].id);
        continue;
      }

      const previousLesson = lessons[i - 1];

      const previousProgress = enrollment?.progresses.find(
        (progress) => progress.lessonId === previousLesson.id,
      );

      // اگر درس قبلی کامل شده باشد، درس فعلی باز می‌شود
      if (previousProgress?.status === "COMPLETED") {
        unlockedLessonIds.add(lessons[i].id);
      } else {
        // از اینجا به بعد همه درس‌ها قفل هستند
        break;
      }
    }
  }

  const firstUnlockedLessonId =
    lessons.find((lesson) => unlockedLessonIds.has(lesson.id))?.id ?? null;

  const formatVideoDuration = (seconds: number | null) => {
    if (!seconds || seconds <= 0) return null;

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };
  return (
    <main dir="rtl" className="min-h-screen bg-gray-50">
      {/* HERO */}

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <div className="mb-4 inline-flex rounded-full bg-indigo-50 px-4 py-2 text-sm text-indigo-700">
                دوره آموزشی
              </div>

              <h1 className="text-4xl font-bold leading-tight">
                {course.title}
              </h1>

              {course.shortDescription && (
                <p className="mt-5 text-lg leading-8 text-gray-600">
                  {course.shortDescription}
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-500">
                <span>👨‍🏫 مدرس: {course.teacher.name || "مدرس دوره"}</span>

                <span>📚 {lessons.length} درس</span>
              </div>

              <div className="mt-8">
                {isEnrolled ? (
                  <Link
                    href={
                      firstUnlockedLessonId
                        ? `/courses/${course.slug}/lessons/${firstUnlockedLessonId}`
                        : "#"
                    }
                    className="inline-flex rounded-xl bg-indigo-600 px-7 py-4 font-medium text-white transition hover:bg-indigo-700"
                  >
                    ▶️ ادامه یادگیری
                  </Link>
                ) : (
                  <Link
                    href={
                      session
                        ? `/courses/${course.slug}/checkout`
                        : `/login?redirect=/courses/${course.slug}`
                    }
                    className="inline-flex rounded-xl bg-indigo-600 px-7 py-4 font-medium text-white transition hover:bg-indigo-700"
                  >
                    💳 خرید و ثبت‌نام
                  </Link>
                )}
              </div>
            </div>

            {/* IMAGE */}

            <div>
              <div className="overflow-hidden rounded-3xl border bg-gray-100 shadow-sm">
                {course.thumbnailUrl ? (
                  <img
                    src={course.thumbnailUrl}
                    alt={course.title}
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center text-gray-400">
                    بدون تصویر دوره
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-sm text-gray-500">قیمت دوره</div>

                <div className="mt-1 text-3xl font-bold">
                  {course.price.toLocaleString("fa-IR")} تومان
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DESCRIPTION */}

      {course.description && (
        <section className="mx-auto max-w-7xl px-6 py-12">
          <div className="rounded-3xl border bg-white p-8">
            <h2 className="text-2xl font-bold">درباره این دوره</h2>

            <p className="mt-5 whitespace-pre-line leading-8 text-gray-600">
              {course.description}
            </p>
          </div>
        </section>
      )}

      {/* ROADMAP */}

      {course.roadmapImageUrl && (
        <section className="mx-auto max-w-7xl px-6 pb-12">
          <div className="rounded-3xl border bg-white p-8">
            <h2 className="text-2xl font-bold">🗺️ نقشه راه دوره</h2>

            <div className="mt-6 overflow-hidden rounded-2xl">
              <img
                src={course.roadmapImageUrl}
                alt="نقشه راه دوره"
                className="mx-auto max-h-[700px] w-auto max-w-full object-contain"
              />
            </div>
          </div>
        </section>
      )}

      {/* CURRICULUM */}

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <h2 className="mb-6 text-2xl font-bold">📚 محتوای دوره</h2>

        <div className="space-y-5">
          {course.sections.map((section) => (
            <div
              key={section.id}
              className="overflow-hidden rounded-2xl border bg-white"
            >
              <div className="border-b bg-gray-50 p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                    {section.order}
                  </span>

                  <div>
                    <h3 className="font-bold">{section.title}</h3>

                    {section.description && (
                      <p className="mt-1 text-sm text-gray-500">
                        {section.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="divide-y">
                {section.lessons.map((lesson) => {
                  const progress = enrollment?.progresses.find(
                    (item) => item.lessonId === lesson.id,
                  );

                  const completed = progress?.status === "COMPLETED";

                  const unlocked =
                    isEnrolled && unlockedLessonIds.has(lesson.id);

                  return (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between p-5"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${
                            completed
                              ? "bg-green-100"
                              : unlocked
                                ? "bg-indigo-100"
                                : "bg-red-100"
                          }`}
                        >
                          {completed ? "✓" : unlocked ? "▶" : "🔒"}
                        </div>

                        <div>
                          <div className="font-medium">{lesson.title}</div>

                          {lesson.videoDuration && (
                            <div className="mt-1 text-xs text-gray-500">
                              ⏱️ {formatVideoDuration(lesson.videoDuration)}
                            </div>
                          )}
                        </div>
                      </div>

                      {completed ? (
                        <Link
                          href={`/courses/${course.slug}/lessons/${lesson.id}`}
                          className="text-sm font-medium text-green-600"
                        >
                          مشاهده مجدد
                        </Link>
                      ) : unlocked ? (
                        <Link
                          href={`/courses/${course.slug}/lessons/${lesson.id}`}
                          className="text-sm font-medium text-indigo-600"
                        >
                          شروع درس
                        </Link>
                      ) : (
                        <span className="text-sm text-red-500">قفل</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
