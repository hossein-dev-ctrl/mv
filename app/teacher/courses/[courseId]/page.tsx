import ThemeIcon from "@/components/panel/theme-icon";
import DeliveryStatus from "@/components/course/delivery-status";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";

import CreateSectionForm from "@/components/teacher/create-section-form";
import ReorderSectionButtons from "@/components/teacher/reorder-section-buttons";
import DeleteCourseButton from "@/components/teacher/delete-course-button";
import CourseStatusButton from "@/components/teacher/course-status-button";
import DeleteSectionButton from "@/components/teacher/delete-section-button";

import { prisma } from "@/lib/prisma";
import { getManagementSession } from "@/lib/management-session";

type PageProps = {
  params: Promise<{
    courseId: string;
  }>;
};

export default async function CourseManagementPage({ params }: PageProps) {
  const session = await getManagementSession();

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
      ...(session.role === "ADMIN" ? {} : { teacherId: session.userId }),
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

  const lessonCount=course.sections.reduce((sum,section)=>sum+section.lessons.length,0);
  return (
    <main className="course-workspace mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <Link href={session.role === "ADMIN" ? "/admin/courses" : "/teacher"} className="panel-action panel-action-slate mb-5">← {session.role === "ADMIN" ? "بازگشت به همهٔ دوره‌ها" : "بازگشت به دوره‌های من"}</Link>
      <section className="course-hero" aria-labelledby="course-heading">
        <div className="relative z-10 flex-1 p-6 sm:p-9">
          <div className="mb-4 flex flex-wrap items-center gap-2"><span className="rounded-full bg-teal-400/20 px-4 py-1 text-xs font-semibold text-teal-100">{{DRAFT:"پیش‌نویس",PUBLISHED:"منتشرشده",ARCHIVED:"آرشیوشده"}[course.status]}</span><DeliveryStatus status={course.deliveryStatus}/></div>
          <h1 id="course-heading" className="text-2xl font-bold leading-relaxed text-white sm:text-3xl">{course.title}</h1>
          <p className="mt-3 max-w-xl text-sm leading-8 text-indigo-100">{course.shortDescription||"محتوا و مسیر یادگیری دانش‌آموزان این دوره را مدیریت کنید."}</p>
          <div className="mt-6 flex flex-wrap gap-5 text-sm text-indigo-100"><span className="flex items-center gap-2"><ThemeIcon name="layers"/>{course.sections.length.toLocaleString('fa-IR')} فصل</span><span className="flex items-center gap-2"><ThemeIcon name="users"/>{course._count.enrollments.toLocaleString('fa-IR')} ثبت‌نام</span></div>
        </div>
        <div className="course-hero-art">{course.thumbnailUrl?<img src={course.thumbnailUrl} alt="" className="h-full w-full object-cover"/>:<div className="hero-book"><ThemeIcon name="book" className="h-20 w-20"/></div>}</div>
      </section>
      <nav className="course-tools" aria-label="بخش‌های دوره">
        <a href="#course-content" className="course-tool is-active"><ThemeIcon name="book"/><span>محتوای دوره</span></a>
        <Link href={`/teacher/courses/${course.id}/edit`} className="course-tool"><ThemeIcon name="settings"/><span>تنظیمات</span></Link>
        <Link href={`/teacher/courses/${course.id}/students`} className="course-tool"><ThemeIcon name="users"/><span>دانش‌آموزان</span></Link>
        <Link href={`/teacher/courses/${course.id}/assignments`} className="course-tool"><ThemeIcon name="file"/><span>ارزیابی‌ها</span></Link>
        <Link href={`/teacher/courses/${course.id}/interests`} className="course-tool"><ThemeIcon name="chart"/><span>متقاضیان</span></Link>
      </nav>
      <section id="course-content" className="course-content-card scroll-mt-5">
        <div className="course-toolbar"><h2 className="flex items-center gap-3 text-xl font-bold"><ThemeIcon name="layers"/>فصل‌ها و درس‌ها</h2><CreateSectionForm courseId={course.id}/></div>
        {course.sections.length===0?<p className="rounded-2xl border border-dashed border-indigo-200 p-8 text-center text-sm text-slate-500">هنوز فصلی ایجاد نشده؛ با دکمهٔ افزودن فصل شروع کنید.</p>:<div className="space-y-3">{course.sections.map((section,index)=>(
          <details key={section.id} open={index===0} className={`course-chapter chapter-tone-${index%5}`}>
            <summary><span className="chapter-symbol"><ThemeIcon name={index%2===0?'book':'layers'}/></span><span className="min-w-0 flex-1 break-words font-semibold">فصل {section.order.toLocaleString('fa-IR')} · {section.title}</span><span className="chapter-count">{section.lessons.length.toLocaleString('fa-IR')} درس</span><span className="chapter-chevron" aria-hidden="true">⌄</span></summary>
            <div className="chapter-body">
              {section.description&&<p className="px-4 py-3 text-sm leading-7 text-slate-500">{section.description}</p>}
              {section.lessons.map((lesson,lessonIndex)=><div key={lesson.id} className="chapter-lesson"><span className={`lesson-symbol lesson-tone-${lessonIndex%3}`}><ThemeIcon name={lesson.videoUrl?'play':'file'}/></span><div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">درس {lesson.order.toLocaleString('fa-IR')} · {lesson.title}</p><p className="mt-1 text-xs text-slate-500">{lesson.status==='PUBLISHED'?'منتشرشده':'پیش‌نویس'}</p></div><Link href={`/teacher/courses/${course.id}/sections/${section.id}/lessons/${lesson.id}`} className={`lesson-open lesson-tone-${lessonIndex%3}`}>مدیریت درس</Link></div>)}
              {!section.lessons.length&&<p className="p-5 text-sm text-slate-500">برای افزودن اولین درس، مدیریت فصل را باز کنید.</p>}
              <div className="chapter-controls"><Link href={`/teacher/courses/${course.id}/sections/${section.id}`} className="panel-action">مدیریت و افزودن درس</Link><div className="flex flex-wrap items-center gap-2"><ReorderSectionButtons sectionId={section.id} isFirst={index===0} isLast={index===course.sections.length-1}/><DeleteSectionButton sectionId={section.id}/></div></div>
            </div>
          </details>
        ))}</div>}
        <div className="course-total"><ThemeIcon name="layers"/><span>مجموع {course.sections.length.toLocaleString('fa-IR')} فصل · {lessonCount.toLocaleString('fa-IR')} درس</span></div>
      </section>
      <details className="theme-disclosure mt-6"><summary>توضیحات و نقشهٔ راه دوره</summary><div className="space-y-5 p-5"><p className="whitespace-pre-wrap text-sm leading-8 text-slate-600">{course.description||"توضیحی برای دوره ثبت نشده است."}</p>{course.roadmapImageUrl?<img src={course.roadmapImageUrl} alt="نقشهٔ راه دوره" className="mx-auto max-h-[600px] w-auto max-w-full rounded-xl object-contain"/>:<p className="text-sm text-slate-500">هنوز نقشهٔ راه ثبت نشده است.</p>}</div></details>
      <section className="theme-disclosure mt-6 p-5"><div className="flex flex-wrap items-center justify-between gap-5"><div><h2 className="font-bold">وضعیت انتشار</h2><p className="mt-2 text-xs leading-7 text-slate-500">فقط دورهٔ منتشرشده برای ثبت‌نام و یادگیری در دسترس است.</p></div><CourseStatusButton courseId={course.id} status={course.status}/></div>{course.status==='PUBLISHED'&&<Link href={`/courses/${course.slug}`} className="panel-action panel-action-slate mt-4">مشاهدهٔ دوره از دید کاربر</Link>}</section>
      {course._count.payments===0&&<details className="theme-disclosure mt-6"><summary className="text-rose-700">حذف دائمی دوره</summary><div className="flex flex-wrap items-center justify-between gap-4 p-5"><p className="text-sm text-slate-500">حذف دوره و اطلاعات وابسته قابل بازگشت نیست.</p><DeleteCourseButton courseId={course.id}/></div></details>}
    </main>
  );
}
