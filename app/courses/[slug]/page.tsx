import ContentSummary,{CertificateInfo} from '@/components/course/content-summary';
import {readPrerequisites} from '@/lib/course-prerequisites';

import ThemeIcon from '@/components/panel/theme-icon';
import ExamGateway from '@/components/assessment/exam-gateway';
import DeliveryStatus from "@/components/course/delivery-status";
import InterestForm from "@/components/course/interest-form";
import CoursePrice from "@/components/course/price";
import { coursePrice } from "@/lib/course-price";
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
      ...(process.env.NODE_ENV!=="development"?{teacher:{testOwnerId:null}}:{}),
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
              isPreview: true,
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

  const adminPreview=session?.role==="ADMIN" && (await prisma.user.findUnique({where:{id:session.userId},select:{role:true}}))?.role==="ADMIN";
  if (!course || (course.status !== "PUBLISHED" && !adminPreview)) {
    notFound();
  }

  const interest=session && course.deliveryStatus==="UPCOMING" ? await prisma.courseInterest.findUnique({where:{courseId_userId:{courseId:course.id,userId:session.userId}}}) : null;
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

  const isOwner = session?.userId === course.teacherId;

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

  const prerequisites=readPrerequisites(course.prerequisites);
  const linked=await prisma.course.findMany({where:{id:{in:prerequisites.flatMap(p=>p.courseId?[p.courseId]:[])},status:'PUBLISHED'},select:{id:true,slug:true,title:true}});
  const formatVideoDuration = (seconds: number | null) => {
    if (!seconds || seconds <= 0) return null;

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes.toLocaleString("fa-IR")}:${remainingSeconds.toLocaleString("fa-IR",{minimumIntegerDigits:2})}`;
  };
  return (
    <main dir="rtl" className="public-course min-h-screen">
      {/* HERO */}

      <section className="public-course-hero">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <Link href="/courses" className="panel-action panel-action-slate mb-6"><ThemeIcon name="arrow" className="me-2 h-4 w-4"/> بازگشت به همهٔ دوره‌ها</Link>
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

              <div className="mt-5"><DeliveryStatus status={course.deliveryStatus}/>{adminPreview&&<p className="mt-3 text-xs text-amber-800">نمای کاربر برای مدیر · {course.status==="PUBLISHED"?"عمومی":"این دوره برای کاربران عمومی قابل مشاهده نیست"}</p>}</div>
              <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-500">
                <span><ThemeIcon name="users" className="inline h-4 w-4"/> مدرس: {course.teacher.name || "مدرس دوره"}</span>

                <span><ThemeIcon name="book" className="inline h-4 w-4"/> {(lessons.length).toLocaleString("fa-IR")} درس</span>
              </div>

              <div className="mt-8">
                {adminPreview ? <p className="text-sm text-slate-600">پیش‌نمایش دوره؛ عملیات ثبت‌نام برای مدیر نمایش داده نمی‌شود.</p> : course.deliveryStatus==="UPCOMING" && !isOwner && !isEnrolled ? (session ? <InterestForm courseId={course.id} registered={!!interest}/> : <Link href={`/login?redirect=/courses/${course.slug}`} className="rounded-xl bg-indigo-600 px-5 py-3 text-white"><ThemeIcon name="check" className="me-2 h-4 w-4"/>ورود برای پیش‌ثبت‌نام رایگان</Link>) : isOwner ? (
                  <Link href={`/teacher/courses/${course.id}`} className="inline-flex rounded-xl bg-indigo-600 px-7 py-4 font-medium text-white"><ThemeIcon name="book" className="me-2 h-4 w-4"/>مدیریت این دوره</Link>
                ) : isEnrolled ? (
                  <Link
                    href={
                      firstUnlockedLessonId
                        ? `/courses/${course.slug}/lessons/${firstUnlockedLessonId}`
                        : "#"
                    }
                    className="inline-flex rounded-xl bg-indigo-600 px-7 py-4 font-medium text-white transition hover:bg-indigo-700"
                  ><ThemeIcon name="book" className="me-2 h-4 w-4"/> ادامه یادگیری
                  </Link>
                ) : (
                  <Link
                    href={
                      session
                        ? `/courses/${course.slug}/checkout`
                        : `/login?redirect=/courses/${course.slug}`
                    }
                    className="inline-flex rounded-xl bg-indigo-600 px-7 py-4 font-medium text-white transition hover:bg-indigo-700"
                  ><ThemeIcon name="check" className="me-2 h-4 w-4"/>
                    {coursePrice(course) === 0 ? "ثبت‌نام رایگان" : "خرید و ثبت‌نام"}
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
                  {course.deliveryStatus==="UPCOMING"?"پیش‌ثبت‌نام بدون پرداخت":<CoursePrice price={course.price} discountPercent={course.discountPercent} />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

<div className="mx-auto max-w-7xl px-6"><ExamGateway courseId={course.id}/></div>
      <div className="mx-auto max-w-7xl px-6"><ContentSummary courseId={course.id}/>{prerequisites.length>0&&<section className="assessment-card my-6"><h2 className="assessment-heading"><ThemeIcon name="layers"/>پیش‌نیازهای دوره</h2><ul className="mt-4 flex flex-wrap gap-3">{prerequisites.map((p,i)=>{const c=linked.find(c=>c.id===p.courseId);return <li key={i}>{c?<Link className="panel-action" href={`/courses/${c.slug}`}><ThemeIcon name="book"/>{c.title}</Link>:<span className="panel-action">{p.title}</span>}</li>})}</ul></section>}<CertificateInfo/></div>
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

      <section className="mx-auto max-w-7xl px-6 pb-8"><div className="rounded-3xl border bg-white p-8"><h2 className="text-2xl font-bold">دربارهٔ مدرس</h2><h3 className="mt-4 font-bold text-indigo-700">{course.teacher.name||"مدرس دوره"}</h3><p className="mt-3 whitespace-pre-line leading-8 text-slate-600">{course.teacherIntro||"معرفی تکمیلی مدرس هنوز ثبت نشده است."}</p></div></section>
      {/* ROADMAP */}

      {course.roadmapImageUrl && (
        <section className="mx-auto max-w-7xl px-6 pb-12">
          <div className="rounded-3xl border bg-white p-8">
            <h2 className="text-2xl font-bold"><ThemeIcon name="map" className="inline me-2 h-6 w-6"/>نقشه راه دوره</h2>

            <div className="mt-6 overflow-hidden rounded-2xl">
              <img
                src={course.roadmapImageUrl}
                alt="نقشه راه دوره"
                className="rounded-xl mx-auto max-h-[700px] w-auto max-w-full object-contain"
              />
            </div>
          </div>
        </section>
      )}

      {/* CURRICULUM */}

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <h2 className="course-toolbar mb-5 text-2xl font-bold"><ThemeIcon name="layers" className="inline me-2 h-6 w-6"/>محتوای دوره</h2>

        <div className="space-y-5">
          {course.sections.filter(section=>section.lessons.some(l=>l.status==='PUBLISHED')).map((section,index) => (
            <details key={section.id} open={index===0} className={`course-chapter chapter-tone-${index%5}`}>
              <summary><span className="chapter-symbol"><ThemeIcon name="book"/></span><span className="min-w-0 flex-1 font-bold">فصل {section.order.toLocaleString('fa-IR')} · {section.title}</span><span className="chapter-count">{section.lessons.filter(l=>l.status==='PUBLISHED').length.toLocaleString('fa-IR')} درس</span><span className="chapter-chevron" aria-hidden="true">⌄</span></summary>
              <div className="chapter-body">
              {section.description&&<p className="px-5 py-4 text-sm leading-8 text-slate-500">{section.description}</p>}
              <div className="divide-y">
                {section.lessons.filter((lesson) => lesson.status === "PUBLISHED").map((lesson) => {
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
                          <ThemeIcon name={completed?"check":unlocked||lesson.isPreview?"play":"lock"}/>
                        </div>

                        <div>
                          <div className="font-medium">{lesson.title}</div>

                          {lesson.videoDuration && (
                            <div className="mt-1 text-xs text-gray-500">
                              <ThemeIcon name="clock" className="inline h-3 w-3"/> {formatVideoDuration(lesson.videoDuration)}
                            </div>
                          )}
                        </div>
                      </div>

                      {lesson.isPreview ? <Link className="panel-action panel-action-teal" href={`/courses/${course.slug}/preview/${lesson.id}`}><ThemeIcon name="play" className="h-4 w-4"/>دموی رایگان</Link> : adminPreview ? <p className="text-sm text-slate-600">پیش‌نمایش دوره؛ عملیات ثبت‌نام برای مدیر نمایش داده نمی‌شود.</p> : course.deliveryStatus==="UPCOMING" && !isOwner && !isEnrolled ? (session ? <InterestForm courseId={course.id} registered={!!interest}/> : <Link href={`/login?redirect=/courses/${course.slug}`} className="rounded-xl bg-indigo-600 px-5 py-3 text-white"><ThemeIcon name="check" className="me-2 h-4 w-4"/>ورود برای پیش‌ثبت‌نام رایگان</Link>) : isOwner ? (
                        <Link href={`/teacher/courses/${course.id}/sections/${section.id}/lessons/${lesson.id}`} className="panel-action"><ThemeIcon name="book" className="me-2 h-4 w-4"/>مدیریت درس</Link>
                      ) : completed ? (
                        <Link
                          href={`/courses/${course.slug}/lessons/${lesson.id}`}
                          className="panel-action panel-action-teal"
                        ><ThemeIcon name="arrow" className="me-2 h-4 w-4"/>
                          مشاهده مجدد
                        </Link>
                      ) : unlocked ? (
                        <Link
                          href={`/courses/${course.slug}/lessons/${lesson.id}`}
                          className="panel-action"
                        ><ThemeIcon name="book" className="me-2 h-4 w-4"/>
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
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
