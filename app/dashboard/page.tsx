
import ThemeIcon from '@/components/panel/theme-icon';
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
      examAttempt: {select:{id:true,score:true}},
      course: {
        include: {
          finalExam:{select:{id:true,published:true}},
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

  const cards=enrollments.map(e=>({...e,summary:getLearningSummary(e.course.sections.flatMap(s=>s.lessons),e.progresses,e.course.status)}));
  const total=cards.reduce((s,c)=>s+c.summary.totalLessons,0),completed=cards.reduce((s,c)=>s+c.summary.completedLessons,0);
  const percentage=total?Math.round(completed/total*100):0;
  const graded=cards.filter(c=>c.examAttempt?.score!=null);
  const average=graded.length?Math.round(graded.reduce((s,c)=>s+(c.examAttempt?.score??0),0)/graded.length):null;
  const upcoming=cards.filter(c=>c.course.status==='PUBLISHED'&&c.course.finalExam?.published&&!c.examAttempt);
  return <main className="learning-dashboard mx-auto max-w-[1440px] px-4 py-6 sm:px-7"><section className="learner-hero"><div><h1>دوره‌های من</h1><p>مسیر یادگیری شما، قدم به قدم</p></div><div className="hero-orbit" aria-hidden="true"><ThemeIcon name="graduation" className="h-20 w-20"/></div></section><div className="learner-stats">{[{label:'دوره‌های ثبت‌نام‌شده',value:cards.length,icon:'book' as const},{label:'درس‌های تکمیل‌شده',value:completed,icon:'play' as const},{label:'آزمون‌های ارسال‌شده',value:cards.filter(c=>c.examAttempt).length,icon:'check' as const},{label:'میانگین نمرهٔ آزمون‌ها',value:average,icon:'star' as const}].map((s,i)=><div className={`learner-stat stat-${i}`} key={s.label}><div><p>{s.label}</p><strong>{s.value===null?'—':s.value.toLocaleString('fa-IR')}</strong></div><span><ThemeIcon name={s.icon}/></span></div>)}</div><div className="learner-dashboard-grid"><section className="learning-panel"><div className="learning-section-title"><h2>دوره‌های من</h2><Link className="panel-action panel-action-primary" href="/courses"><ThemeIcon name="search" className="h-4 w-4"/>همهٔ دوره‌ها</Link></div>{!cards.length?<div className="p-8 text-center"><h2>هنوز در دوره‌ای ثبت‌نام نکرده‌اید</h2><p className="mt-3 text-sm text-slate-500">یک دوره انتخاب کنید و یادگیری را شروع کنید.</p></div>:<div className="space-y-4">{cards.map(c=><article className="learner-course-row" key={c.id}><div className="learner-course-info"><div className="flex flex-wrap items-center gap-3"><h3>{c.course.title}</h3><span className={`learning-status ${c.summary.state==='completed'?'is-complete':''}`}>{c.summary.state==='completed'?'تکمیل‌شده':c.summary.state==='unavailable'?'فعلاً در دسترس نیست':c.summary.state==='empty'?'در انتظار انتشار درس':c.summary.hasStarted?'در حال یادگیری':'آمادهٔ شروع'}</span></div><p className="my-3 text-sm leading-7 text-slate-500">{c.course.shortDescription}</p><div className="flex items-center gap-3"><div className="learning-progress flex-1" role="progressbar" aria-label={`پیشرفت ${c.course.title}`} aria-valuenow={c.summary.percentage} aria-valuemin={0} aria-valuemax={100}><span className={c.summary.state==='completed'?'is-complete':''} style={{width:`${c.summary.percentage}%`}}/></div><strong className="text-xs">{c.summary.percentage.toLocaleString('fa-IR')}٪</strong></div><p className="mt-3 text-xs text-slate-500">{c.summary.completedLessons.toLocaleString('fa-IR')} از {c.summary.totalLessons.toLocaleString('fa-IR')} درس تکمیل شده</p>{c.summary.nextLesson&&<p className="mt-2 text-xs text-slate-500">درس بعدی: {c.summary.nextLesson.title}</p>}</div><div className="learner-thumbnail">{c.course.thumbnailUrl?<img src={c.course.thumbnailUrl} alt="" loading="lazy"/>:<ThemeIcon name="book" className="h-12 w-12"/>}</div><div className="learner-course-actions">{c.summary.nextLesson&&<Link className="panel-action panel-action-primary" href={`/courses/${c.course.slug}/lessons/${c.summary.nextLesson.id}`}><ThemeIcon name="play" className="h-4 w-4"/>{c.summary.hasStarted?'ادامهٔ یادگیری':'شروع یادگیری'}</Link>}{c.course.status==='PUBLISHED'&&<Link className="panel-action panel-action-slate" href={`/courses/${c.course.slug}`}><ThemeIcon name="eye" className="h-4 w-4"/>{c.summary.state==='completed'?'مرور درس‌های دوره':'مشاهدهٔ محتوای دوره'}</Link>}<Link className="panel-action" href={`/dashboard/courses/${c.courseId}/grades`}><ThemeIcon name="award" className="h-4 w-4"/>کارنامهٔ نهایی</Link>{c.summary.state==='empty'&&<p className="text-xs">هنوز درسی برای این دوره منتشر نشده است.</p>}{c.summary.state==='unavailable'&&<p className="text-xs">این دوره در حال حاضر قابل مشاهده نیست. ثبت‌نام و پیشرفت شما حفظ شده است.</p>}</div></article>)}</div>}</section><aside className="space-y-5"><section className="learning-panel"><h2 className="learning-aside-heading"><ThemeIcon name="chart" className="h-5 w-5"/>پیشرفت کلی شما</h2><div className="progress-ring" style={{background:`conic-gradient(#6740ff ${percentage}%,#ececff 0)`}} role="img" aria-label={`${percentage.toLocaleString('fa-IR')} درصد تکمیل شده`}><span>{percentage.toLocaleString('fa-IR')}٪</span></div><p className="text-center text-sm">{completed.toLocaleString('fa-IR')} از {total.toLocaleString('fa-IR')} درس تکمیل شده</p><p className="mt-4 text-center text-xs text-slate-500">میانگین نمره فقط از آزمون‌های تصحیح‌شده محاسبه می‌شود.</p></section><section className="learning-panel"><h2 className="learning-aside-heading"><ThemeIcon name="exam" className="h-5 w-5"/>آزمون‌های پیش رو</h2>{upcoming.length?upcoming.map(c=>!c.summary.isCompleted?<div className="upcoming-exam" key={c.id}><span>{c.course.title}<small>پس از تکمیل درس‌ها باز می‌شود</small></span><ThemeIcon name="lock" className="h-4 w-4"/></div>:<Link className="upcoming-exam" key={c.id} href={`/dashboard/courses/${c.courseId}/exam`}><span>{c.course.title}<small>{c.summary.isCompleted?'درس‌ها تکمیل شده؛ ورود به آزمون':'پس از تکمیل درس‌ها باز می‌شود'}</small></span><ThemeIcon name="arrow" className="h-4 w-4"/></Link>):<p className="text-sm leading-7 text-slate-500">آزمون منتشرشدهٔ بدون پاسخ ندارید.</p>}</section></aside></div><section className="learning-support"><div><h2>به آینده‌ات سرمایه‌گذاری کن</h2><p>هر قدم کوچک، تو را به هدفت نزدیک‌تر می‌کند.</p></div><Link href="/tickets" className="panel-action panel-action-primary"><ThemeIcon name="headset" className="h-5 w-5"/>پشتیبانی و راهنما</Link></section></main>;
}
