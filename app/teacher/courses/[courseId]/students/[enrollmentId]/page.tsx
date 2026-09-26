
import ThemeIcon from '@/components/panel/theme-icon';
import FinalReport from '@/components/assessment/final-report';
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getLearningSummary } from "@/lib/student-dashboard";
import { getTeacherCourse, enrollmentLabels, formatStudentDate } from "@/lib/teacher-students";

export default async function StudentProgressPage({ params }: {
  params: Promise<{ courseId: string; enrollmentId: string }>;
}) {
  const { courseId, enrollmentId } = await params;
  const course = await getTeacherCourse(courseId);
  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, courseId },
    select: {
      status: true, enrolledAt: true,
      user: { select: { name: true, email: true, phone: true } },
      progresses: {
        where: { lesson: { status: "PUBLISHED", section: { courseId } } },
        select: { lessonId: true, status: true, startedAt: true, completedAt: true, videoCompletedAt: true },
      },
    },
  });
  if (!enrollment) notFound();
  const name = enrollment.user.name?.trim() || enrollment.user.email || enrollment.user.phone || "کاربر بدون نام";
  const lessons = course.sections.flatMap(section => section.lessons);
  const summary = getLearningSummary(lessons, enrollment.progresses, course.status);
  const progressByLesson = new Map(enrollment.progresses.map(progress => [progress.lessonId, progress]));
  const lessonLabels = { NOT_STARTED: "شروع نشده", IN_PROGRESS: "در حال یادگیری", COMPLETED: "تکمیل‌شده" };
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <Link href={`/teacher/courses/${courseId}/students`} className="panel-action panel-action-teal"><ThemeIcon name="arrow" className="me-2 h-4 w-4"/> بازگشت به دانش‌آموزان دوره</Link>
      <h1 className="mt-4 text-2xl font-bold">پیشرفت <bdi>{name}</bdi></h1>
      <p className="mt-2 text-slate-600">{course.title}</p>
      <dl className="my-6 grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 sm:grid-cols-3">
        <div><dt className="text-sm text-slate-500">وضعیت ثبت‌نام</dt><dd className="mt-2 font-medium">{enrollmentLabels[enrollment.status]}</dd></div>
        <div><dt className="text-sm text-slate-500">تاریخ ثبت‌نام</dt><dd className="mt-2 font-medium">{formatStudentDate(enrollment.enrolledAt)}</dd></div>
        <div><dt className="text-sm text-slate-500">پیشرفت درس‌های منتشرشده</dt><dd className="mt-2 font-medium">{summary.completedLessons.toLocaleString("fa-IR")} از {summary.totalLessons.toLocaleString("fa-IR")} درس · {summary.percentage.toLocaleString("fa-IR")}٪</dd></div>
      </dl>
      {enrollment.status === "CANCELLED" && <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">این ثبت‌نام لغو شده و دسترسی آموزشی غیرفعال است؛ سابقهٔ پیشرفت قبلی حفظ شده است.</p>}
      {course.status !== "PUBLISHED" && <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">دوره در حال حاضر منتشر نیست و برای یادگیری در دسترس دانش‌آموز قرار ندارد.</p>}
      <p className="mb-6 text-sm leading-7 text-slate-600">پایان ویدئو به معنی تکمیل درس نیست؛ تکمیل درس با اقدام جداگانهٔ دانش‌آموز ثبت می‌شود. فقط درس‌های منتشرشده در این گزارش آمده‌اند.</p>
      <FinalReport enrollmentId={enrollmentId}/>
      {lessons.length === 0 ? <p className="rounded-2xl border bg-white p-8 text-slate-600">هنوز درسی منتشر نشده است.</p> : course.sections.filter(section => section.lessons.length > 0).map(section => (
        <section key={section.id} className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <h2 className="bg-slate-100 px-5 py-4 font-bold">{section.title}</h2>
          <ol className="divide-y divide-slate-100">
            {section.lessons.map(lesson => {
              const progress = progressByLesson.get(lesson.id);
              const status = progress?.status ?? "NOT_STARTED";
              return <li key={lesson.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-medium">{lesson.title}</h3><span className={`rounded-full px-3 py-1 text-xs ${status === "COMPLETED" ? "bg-green-50 text-green-800" : "bg-slate-100 text-slate-700"}`}>{lessonLabels[status]}</span></div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <div><dt className="text-slate-500">شروع درس</dt><dd className="mt-1">{formatStudentDate(progress?.startedAt ?? null)}</dd></div>
                  <div><dt className="text-slate-500">پایان ویدئو</dt><dd className="mt-1">{formatStudentDate(progress?.videoCompletedAt ?? null)}</dd></div>
                  <div><dt className="text-slate-500">تکمیل درس</dt><dd className="mt-1">{formatStudentDate(progress?.completedAt ?? null)}</dd></div>
                </dl>
              </li>;
            })}
          </ol>
        </section>
      ))}
    </main>
  );
}
