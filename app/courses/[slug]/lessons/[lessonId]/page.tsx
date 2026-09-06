import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { getLessonAccess } from "@/lib/lesson-access";
import LessonView from "@/components/course/lesson-view";
import LessonContent from "@/components/course/lesson-content";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    slug: string;
    lessonId: string;
  }>;
};

export default async function LessonPage({ params }: Props) {
  const session = await getSession();

  if (!session) {
    const { slug, lessonId } = await params;

    redirect(`/login?redirect=/courses/${slug}/lessons/${lessonId}`);
  }

  const { slug, lessonId } = await params;

  /*
   * تمام بررسی‌های دسترسی Lesson
   * از یک منبع مرکزی انجام می‌شود.
   */
  const access = await getLessonAccess(session.userId, lessonId);

  /*
   * اگر Lesson وجود نداشته باشد
   */
  if (access.reason === "LESSON_NOT_FOUND") {
    notFound();
  }

  /*
   * اگر Lesson یا Course منتشر نشده باشد
   */
  if (
    access.reason === "LESSON_NOT_PUBLISHED" ||
    access.reason === "COURSE_NOT_PUBLISHED"
  ) {
    notFound();
  }

  /*
   * اگر کاربر Enrollment نداشته باشد
   */
  if (access.reason === "NOT_ENROLLED") {
    redirect(`/courses/${slug}`);
  }

  /*
   * اگر Lesson قفل باشد
   */
  if (access.reason === "LESSON_LOCKED") {
    redirect(`/courses/${slug}`);
  }

  /*
   * اگر به هر دلیل اجازه دسترسی وجود نداشت
   */
  if (!access.allowed) {
    redirect(`/courses/${slug}`);
  }

  const lesson = access.lesson;
  const course = access.course;
  const enrollment = access.enrollment;
  const lessons = access.lessons;

  /*
   * اطمینان از اینکه URL متعلق به همین Course است
   */
  if (course.slug !== slug) {
    notFound();
  }

  /*
   * وضعیت Lesson فعلی
   *
   * این مقدار مستقیماً از DB می‌آید.
   */
  const progress = enrollment.progresses.find(
    (item) => item.lessonId === lesson.id,
  );

  /*
   * درس‌های قبلی و بعدی
   */
  const currentIndex = lessons.findIndex((item) => item.id === lesson.id);

  const previousLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;

  const nextLesson =
    currentIndex >= 0 && currentIndex < lessons.length - 1
      ? lessons[currentIndex + 1]
      : null;

  /*
   * تعداد درس‌های تکمیل‌شده
   */
  const completedLessons = enrollment.progresses.filter(
    (item) =>
      item.status === "COMPLETED" &&
      lessons.some((lessonItem) => lessonItem.id === item.lessonId),
  ).length;

  /*
   * درصد پیشرفت
   */
  const totalLessons = lessons.length;

  const percentage =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  /*
   * آیا Lesson فعلی تکمیل شده؟
   */
  const isCompleted = progress?.status === "COMPLETED";

  return (
    <LessonView lessonId={lesson.id}>
      <main dir="rtl" className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-6xl">
          {/* Header */}

          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <Link
              href={`/courses/${slug}`}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              ← بازگشت به دوره
            </Link>

            <div className="rounded-full bg-white px-4 py-2 text-sm shadow-sm">
              پیشرفت دوره:
              <span className="mr-2 font-bold text-indigo-600">
                {percentage}٪
              </span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* محتوای اصلی */}

            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="mb-6">
                <p className="text-sm text-gray-500">{lesson.section.title}</p>

                <h1 className="mt-2 text-3xl font-bold">{lesson.title}</h1>
              </div>

              {/* توضیحات */}

              {lesson.description && (
                <div className="mt-8">
                  <h2 className="text-xl font-bold">توضیحات درس</h2>

                  <p className="mt-4 whitespace-pre-line leading-8 text-gray-600">
                    {lesson.description}
                  </p>
                </div>
              )}

              {/* فایل‌ها */}

              {lesson.files.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-xl font-bold">📎 فایل‌های درس</h2>

                  <div className="mt-4 space-y-2">
                    {lesson.files.map((file) => (
                      <a
                        key={file.id}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-xl border p-4 transition hover:bg-gray-50"
                      >
                        📄 {file.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <LessonContent
                lessonId={lesson.id}
                videoUrl={lesson.videoUrl}
                isCompleted={isCompleted}
              />

              {/* Navigation */}

              <div className="mt-8 flex flex-wrap justify-between gap-3 border-t pt-6">
                {previousLesson ? (
                  <Link
                    href={`/courses/${slug}/lessons/${previousLesson.id}`}
                    className="rounded-xl border px-5 py-3 text-sm font-medium transition hover:bg-gray-50"
                  >
                    → درس قبلی
                  </Link>
                ) : (
                  <div />
                )}

                {isCompleted && nextLesson ? (
                  <Link
                    href={`/courses/${slug}/lessons/${nextLesson.id}`}
                    className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-indigo-700"
                  >
                    درس بعدی ←
                  </Link>
                ) : null}
              </div>
            </div>

            {/* Sidebar */}

            <aside className="h-fit rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">محتوای دوره</h2>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>پیشرفت</span>

                  <span className="font-bold">
                    {completedLessons} از {totalLessons}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all"
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-6 space-y-2">
                {lessons.map((item, index) => {
                  const itemProgress = enrollment.progresses.find(
                    (progressItem) => progressItem.lessonId === item.id,
                  );

                  const itemCompleted = itemProgress?.status === "COMPLETED";

                  const isCurrent = item.id === lesson.id;

                  const isUnlocked =
                    index === 0 ||
                    enrollment.progresses.some(
                      (progressItem) =>
                        progressItem.lessonId === lessons[index - 1]?.id &&
                        progressItem.status === "COMPLETED",
                    );

                  return (
                    <div key={item.id}>
                      {isUnlocked ? (
                        <Link
                          href={`/courses/${slug}/lessons/${item.id}`}
                          className={`block rounded-xl border p-3 text-sm transition ${
                            isCurrent
                              ? "border-indigo-300 bg-indigo-50"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>
                              {itemCompleted ? "✅" : isCurrent ? "▶️" : "⭕"}
                            </span>

                            <span
                              className={
                                isCurrent ? "font-bold text-indigo-700" : ""
                              }
                            >
                              {index + 1}. {item.title}
                            </span>
                          </div>
                        </Link>
                      ) : (
                        <div className="rounded-xl border bg-gray-50 p-3 text-sm text-gray-400">
                          <div className="flex items-center gap-2">
                            <span>🔒</span>

                            <span>
                              {index + 1}. {item.title}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </aside>
          </div>
        </div>
      </main>
    </LessonView>
  );
}
