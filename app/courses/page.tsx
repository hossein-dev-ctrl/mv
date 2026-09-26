
import ThemeIcon from '@/components/panel/theme-icon';
import DeliveryStatus from "@/components/course/delivery-status";
import CoursePrice from "@/components/course/price";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const session = await getSession();
  const courses = await prisma.course.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    select: {
      deliveryStatus:true, id: true, slug: true, title: true, shortDescription: true,
      thumbnailUrl: true, price: true, discountPercent: true, teacherId: true,
      teacher: { select: { name: true } },
    },
  });
  const panel = session?.role === "ADMIN" ? "/admin" : session?.role === "TEACHER" ? "/teacher" : "/dashboard";

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      {session && <Link href={panel} className="panel-action panel-action-slate"><ThemeIcon name="arrow" className="me-2 h-4 w-4"/>← بازگشت به پنل من</Link>}
      <h1 className="mt-4 text-3xl font-bold text-slate-900">همهٔ دوره‌ها</h1>
      <p className="mt-3 leading-7 text-slate-600">دورهٔ مورد علاقه‌تان را انتخاب کنید و جزئیات و سرفصل‌های آن را ببینید.</p>
      {courses.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">هنوز دوره‌ای منتشر نشده است.</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <article key={course.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {course.thumbnailUrl ? (
                // Course images may be served from instructor-configured storage hosts.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={course.thumbnailUrl} alt={course.title} className="aspect-video w-full object-cover" />
              ) : <div className="flex aspect-video items-center justify-center bg-indigo-50 text-indigo-500">آموزش آنلاین</div>}
              <div className="flex flex-1 flex-col p-5">
                <DeliveryStatus status={course.deliveryStatus}/><h2 className="mt-3 text-xl font-bold"><Link href={`/courses/${course.slug}`} className="hover:text-indigo-600">{course.title}</Link></h2>
                <p className="mt-2 text-sm text-slate-500">مدرس: {course.teacher.name || "مدرس دوره"}</p>
                {course.shortDescription && <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600">{course.shortDescription}</p>}
                <div className="mt-auto pt-5">
                  <p className="font-bold">{course.deliveryStatus==="UPCOMING"?"پیش‌ثبت‌نام بدون پرداخت":<CoursePrice price={course.price} discountPercent={course.discountPercent} />}</p>
                  <Link href={`/courses/${course.slug}`} className="mt-4 inline-block rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-700"><ThemeIcon name="arrow" className="me-2 h-4 w-4"/>مشاهدهٔ دوره</Link>
                  {session?.userId === course.teacherId && <Link href={`/teacher/courses/${course.id}`} className="panel-action ms-4"><ThemeIcon name="book" className="me-2 h-4 w-4"/>مدیریت دورهٔ من</Link>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
