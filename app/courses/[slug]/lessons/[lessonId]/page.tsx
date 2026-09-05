import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LessonView from "@/components/course/lesson-view";
import CompleteLessonButton from "@/components/course/complete-lesson-button";
type Props = {
  params: Promise<{
    slug: string;
    lessonId: string;
  }>;
};

export default async function LessonPage({ params }: Props) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const { slug, lessonId } = await params;

  const lesson = await prisma.lesson.findUnique({
    where: {
      id: lessonId,
    },

    include: {
      section: {
        include: {
          course: true,
        },
      },

      files: true,
    },
  });

  if (!lesson) {
    notFound();
  }

  if (lesson.section.course.slug !== slug) {
    notFound();
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: session.userId,
        courseId: lesson.section.courseId,
      },
    },

    include: {
      progresses: true,
    },
  });

  if (!enrollment || enrollment.status === "CANCELLED") {
    redirect(`/courses/${slug}`);
  }

  const progress = enrollment.progresses.find(
    (item) => item.lessonId === lesson.id,
  );

  /*
   * بررسی اینکه درس مجاز است یا نه
   */

  const allLessons = await prisma.lesson.findMany({
    where: {
      section: {
        courseId: lesson.section.courseId,
      },
      status: "PUBLISHED",
    },

    orderBy: [
      {
        section: {
          order: "asc",
        },
      },
      {
        order: "asc",
      },
    ],
  });

  const currentIndex = allLessons.findIndex((item) => item.id === lesson.id);

  if (currentIndex > 0) {
    const previousLesson = allLessons[currentIndex - 1];

    const previousProgress = enrollment.progresses.find(
      (item) => item.lessonId === previousLesson.id,
    );

    if (previousProgress?.status !== "COMPLETED") {
      redirect(`/courses/${slug}`);
    }
  }

  return (
    <LessonView lessonId={lesson.id}>
      {/* <div className="rounded-2xl border bg-white p-6 shadow-sm"> */}
      {/* تمام محتوای فعلی Lesson */}

      <main dir="rtl" className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-5xl">
          <Link href={`/courses/${slug}`} className="text-sm text-indigo-600">
            ← بازگشت به دوره
          </Link>

          <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
            <div className="mb-6">
              <p className="text-sm text-gray-500">{lesson.section.title}</p>

              <h1 className="mt-2 text-3xl font-bold">{lesson.title}</h1>
            </div>

            {/* ویدئو */}

            {lesson.videoUrl ? (
              <video
                controls
                className="w-full rounded-2xl bg-black"
                src={lesson.videoUrl}
              />
            ) : (
              <div className="rounded-xl bg-gray-100 p-12 text-center text-gray-500">
                ویدئویی برای این درس ثبت نشده است.
              </div>
            )}

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
                      className="block rounded-xl border p-4 hover:bg-gray-50"
                    >
                      📄 {file.name}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* وضعیت */}

            <div className="mt-8 border-t pt-6">
              {progress?.status === "COMPLETED" ? (
                <div className="rounded-xl bg-green-50 p-4 font-medium text-green-700">
                  ✅ این درس را تکمیل کرده‌اید.
                </div>
              ) : (
                <CompleteLessonButton lessonId={lesson.id} />
              )}
            </div>
          </div>
        </div>
      </main>
      {/* </div> */}
    </LessonView>
  );
}
