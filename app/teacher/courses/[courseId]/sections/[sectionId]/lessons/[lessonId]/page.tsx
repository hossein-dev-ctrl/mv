import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import EditLessonForm from "@/components/teacher/edit-lesson-form";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import LogoutButton from "@/components/logout-button";
import UploadLessonVideoForm from "@/components/teacher/upload-lesson-video-form";
import UploadLessonFileForm from "@/components/teacher/upload-lesson-file-form";
import DeleteLessonFileButton from "@/components/teacher/delete-lesson-file-button";
type PageProps = {
  params: Promise<{
    courseId: string;
    sectionId: string;
    lessonId: string;
  }>;
};

export default async function LessonManagementPage({ params }: PageProps) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "TEACHER" && session.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { courseId, sectionId, lessonId } = await params;

  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      sectionId,
      section: {
        courseId,
      },
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

  if (
    session.role !== "ADMIN" &&
    lesson.section.course.teacherId !== session.userId
  ) {
    redirect("/teacher");
  }

  return (
    <main dir="rtl" className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link
              href={`/teacher/courses/${courseId}/sections/${sectionId}`}
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              ← بازگشت به فصل
            </Link>

            <p className="mt-4 text-sm text-gray-400">
              {lesson.section.course.title}
            </p>

            <p className="mt-1 text-sm text-gray-500">{lesson.section.title}</p>

            <h1 className="mt-2 text-3xl font-bold">{lesson.title}</h1>
          </div>

          <LogoutButton />
        </div>

        {/* Lesson Info */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main */}
          <div className="space-y-6 lg:col-span-2">
            {/* Description */}
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold">📝 توضیحات درس</h2>

              {lesson.description ? (
                <p className="whitespace-pre-wrap leading-8 text-gray-600">
                  {lesson.description}
                </p>
              ) : (
                <p className="text-gray-400">
                  هنوز توضیحی برای این درس ثبت نشده است.
                </p>
              )}
            </section>
            <EditLessonForm
              lessonId={lesson.id}
              initialTitle={lesson.title}
              initialDescription={lesson.description ?? ""}
              initialVideoDuration={lesson.videoDuration}
              initialStatus={lesson.status}
            />

            {/* Video */}
            <UploadLessonVideoForm
              lessonId={lesson.id}
              currentVideoUrl={lesson.videoUrl}
              currentDuration={lesson.videoDuration}
            />

            <UploadLessonFileForm lessonId={lesson.id} />
            {/* Files */}
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-xl font-bold">📚 فایل‌های این درس</h2>

              {lesson.files.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed p-8 text-center text-gray-400">
                  هنوز فایلی برای این درس اضافه نشده است.
                </div>
              ) : (
                <div className="space-y-3">
                  {lesson.files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between rounded-xl border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50">
                          📎
                        </div>

                        <div>
                          <p className="font-medium">{file.name}</p>

                          <p className="mt-1 text-xs text-gray-400">
                            {file.size
                              ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                              : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
                        >
                          مشاهده
                        </a>

                        <DeleteLessonFileButton fileId={file.id} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Status */}
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-bold">وضعیت درس</h2>

              {lesson.status === "PUBLISHED" ? (
                <div className="rounded-xl bg-green-50 p-4 text-green-700">
                  <div className="font-bold">🟢 منتشر شده</div>

                  <p className="mt-1 text-sm">
                    این درس برای دانشجویان قابل مشاهده است.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl bg-yellow-50 p-4 text-yellow-700">
                  <div className="font-bold">🟡 پیش‌نویس</div>

                  <p className="mt-1 text-sm">این درس هنوز منتشر نشده است.</p>
                </div>
              )}
            </section>

            {/* Duration */}
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-bold">⏱ مدت ویدئو</h2>

              {lesson.videoDuration ? (
                <p className="text-2xl font-bold">
                  {Math.floor(lesson.videoDuration / 60)}:
                  {String(lesson.videoDuration % 60).padStart(2, "0")}
                </p>
              ) : (
                <p className="text-gray-400">ثبت نشده</p>
              )}
            </section>

            {/* Order */}
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-bold">ترتیب درس</h2>

              <p className="text-3xl font-bold">{lesson.order}</p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
