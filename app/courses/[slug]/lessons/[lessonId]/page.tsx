import LearningTabs from '@/components/course/learning-tabs';

import ThemeIcon from '@/components/panel/theme-icon';
import ExamGateway from '@/components/assessment/exam-gateway';
import LessonAssignment from "@/components/assignments/lesson-assignment";
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


  const sections=Array.from(new Map(lessons.map(l=>[l.sectionId,{id:l.sectionId,title:l.section.title,order:l.section.order}])).values());
  const roadmap=<section className="learning-panel mt-5"><h2 className="learning-aside-heading"><ThemeIcon name="map" className="h-5 w-5"/>نقشهٔ راه یادگیری این دوره</h2><div className="learning-roadmap">{sections.map(s=>{const group=lessons.filter(l=>l.sectionId===s.id),done=group.every(l=>enrollment.progresses.some(p=>p.lessonId===l.id&&p.status==='COMPLETED'));return <div key={s.id} className={s.id===lesson.sectionId?'current':done?'done':''}><span>{done?<ThemeIcon name="check"/>:s.order.toLocaleString('fa-IR')}</span><strong>{s.title}</strong><small>{done?'تکمیل‌شده':s.id===lesson.sectionId?'فصل فعلی':'در مسیر یادگیری'}</small></div>})}</div>{course.roadmapImageUrl&&<img src={course.roadmapImageUrl} alt="نقشهٔ راه دوره" className="mx-auto mt-6 max-h-[500px] max-w-full rounded-xl"/>}</section>;
  const contents=<div className="lesson-study-grid"><section className="learning-panel"><LessonContent key={`${lesson.id}:${lesson.videoUrl??''}`} lessonId={lesson.id} videoUrl={lesson.videoUrl} isCompleted={isCompleted} hasCompletedVideo={!!progress?.videoCompletedAt}/><h2 className="my-5 text-xl font-bold">{lesson.title}</h2><p className="whitespace-pre-wrap text-sm leading-8 text-slate-500">{lesson.description}</p>{lesson.files.length>0&&<section className="mt-6 border-t border-slate-100 pt-5"><h3 className="learning-aside-heading"><ThemeIcon name="download" className="h-5 w-5"/>فایل‌های ضمیمه</h3>{lesson.files.map(file=><a key={file.id} href={file.url} target="_blank" rel="noopener noreferrer" className="lesson-file-link"><ThemeIcon name="file" className="h-5 w-5"/>{file.name}<span className="ms-auto text-indigo-600">دریافت</span></a>)}</section>}<LessonAssignment lessonId={lesson.id} enrollmentId={enrollment.id}/><div className="panel-actions mt-6">{previousLesson&&<Link className="panel-action panel-action-slate" href={`/courses/${slug}/lessons/${previousLesson.id}`}><ThemeIcon name="arrow" className="h-4 w-4"/>درس قبلی</Link>}{isCompleted&&nextLesson&&<Link className="panel-action panel-action-primary" href={`/courses/${slug}/lessons/${nextLesson.id}`}><ThemeIcon name="arrow" className="h-4 w-4 rotate-180"/>درس بعدی</Link>}</div></section><section className="learning-panel"><h2 className="learning-aside-heading"><ThemeIcon name="layers" className="h-5 w-5"/>درس‌های دوره</h2><div className="space-y-3">{lessons.map((item,index)=>{const done=enrollment.progresses.some(p=>p.lessonId===item.id&&p.status==='COMPLETED'),unlocked=index===0||enrollment.progresses.some(p=>p.lessonId===lessons[index-1].id&&p.status==='COMPLETED');const row=<><span className="lesson-index">{(index+1).toLocaleString('fa-IR')}</span><div className="min-w-0 flex-1"><strong className="block text-sm leading-7">{item.title}</strong><span className="mt-2 block text-xs text-slate-500">{item.id===lesson.id?'در حال مشاهده':done?'تکمیل‌شده':unlocked?'آمادهٔ یادگیری':'قفل'}{item.videoDuration?` · ${Math.ceil(item.videoDuration/60).toLocaleString('fa-IR')} دقیقه`:''}</span></div><ThemeIcon name={done?'check':unlocked?'play':'lock'} className="h-4 w-4"/></>;return unlocked?<Link key={item.id} className={`lesson-list-row ${item.id===lesson.id?'current':''}`} aria-current={item.id===lesson.id?'page':undefined} href={`/courses/${slug}/lessons/${item.id}`}>{row}</Link>:<div key={item.id} className="lesson-list-row locked">{row}</div>})}</div></section></div>;
  return <LessonView lessonId={lesson.id}><main className="learner-classroom mx-auto max-w-[1500px] px-4 py-6"><div className="classroom-main"><nav aria-label="مسیر صفحه" className="mb-4 flex flex-wrap gap-2 text-xs text-slate-500"><Link href="/dashboard">داشبورد دانش‌آموز</Link><span>/</span><Link href={`/courses/${slug}`}>{course.title}</Link><span>/</span><span>{lesson.section.title}</span></nav><section className="learner-hero lesson-hero"><div><h1>{lesson.section.title}</h1><p>{lesson.title}</p></div>{course.thumbnailUrl?<img src={course.thumbnailUrl} alt=""/>:<div className="hero-orbit" aria-hidden="true"><ThemeIcon name="book" className="h-16 w-16"/></div>}</section><LearningTabs panels={[{title:'محتوا',icon:'play',content:contents},{title:'نقشهٔ راه',icon:'map',content:roadmap},{title:'توضیحات دوره',icon:'file',content:<section className="learning-panel"><p className="whitespace-pre-wrap leading-8">{course.description||'توضیحی ثبت نشده است.'}</p></section>}]}/></div><aside className="classroom-sidebar learning-panel">{course.thumbnailUrl&&<img src={course.thumbnailUrl} alt="" className="mb-5 aspect-video w-full rounded-2xl object-cover"/>}<h2 className="text-xl font-bold">{course.title}</h2><p className="my-3 text-sm text-slate-500">{sections.length.toLocaleString('fa-IR')} فصل · {totalLessons.toLocaleString('fa-IR')} درس</p><div className="my-5 border-y border-slate-100 py-5"><p className="mb-3 flex justify-between text-sm"><span>پیشرفت دوره</span><strong>{percentage.toLocaleString('fa-IR')}٪</strong></p><div className="learning-progress" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100} aria-label="پیشرفت دوره"><span style={{width:`${percentage}%`}}/></div></div><div className="rounded-xl bg-indigo-50 p-4"><p className="text-xs text-slate-500">مدرس دوره</p><strong className="mt-2 block text-sm">{course.teacher.name||'مدرس دوره'}</strong><p className="mt-2 text-xs leading-7 text-slate-500">{course.teacherIntro}</p></div><nav className="mt-5 grid gap-3"><Link href={`/courses/${slug}`} className="panel-action panel-action-slate"><ThemeIcon name="book" className="h-5 w-5"/>مشاهدهٔ دوره</Link><Link href={`/dashboard/courses/${course.id}/grades`} className="panel-action"><ThemeIcon name="award" className="h-5 w-5"/>کارنامه و نظر من</Link><Link href="/tickets" className="panel-action panel-action-slate"><ThemeIcon name="headset" className="h-5 w-5"/>پرسش و پشتیبانی</Link></nav><ExamGateway courseId={course.id}/><div className="mt-5 rounded-2xl bg-violet-50 p-4 text-sm leading-8">سؤال دارید؟ از بخش تیکت با مدرس یا مدیریت در ارتباط باشید.</div></aside></main></LessonView>;
}
