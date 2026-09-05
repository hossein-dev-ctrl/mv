import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import EnrollButton from "@/components/course/enroll-button";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CheckoutPage({ params }: Props) {
  const { slug } = await params;

  const session = await getSession();

  /*
   * کاربر باید وارد حسابش شده باشد
   */

  if (!session) {
    redirect(`/login?redirect=/courses/${slug}/checkout`);
  }

  /*
   * پیدا کردن دوره
   */

  const course = await prisma.course.findUnique({
    where: {
      slug,
    },

    select: {
      id: true,
      title: true,
      slug: true,
      shortDescription: true,
      thumbnailUrl: true,
      price: true,
      status: true,
    },
  });

  if (!course || course.status !== "PUBLISHED") {
    notFound();
  }

  /*
   * اگر قبلاً ثبت نام کرده باشد
   */

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: session.userId,
        courseId: course.id,
      },
    },

    select: {
      id: true,
      status: true,
    },
  });

  /*
   * اگر قبلاً ثبت‌نام کرده،
   * دیگر نباید دوباره پول بدهد.
   */

  if (enrollment && enrollment.status !== "CANCELLED") {
    redirect(`/courses/${course.slug}`);
  }

  return (
    <main dir="rtl" className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-6 py-12">
        {/* عنوان */}

        <div className="mb-8">
          <Link
            href={`/courses/${course.slug}`}
            className="text-sm text-indigo-600 hover:underline"
          >
            ← بازگشت به دوره
          </Link>

          <h1 className="mt-4 text-3xl font-bold">ثبت‌نام در دوره</h1>

          <p className="mt-2 text-gray-500">
            اطلاعات دوره را بررسی کنید و برای پرداخت ادامه دهید.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* اطلاعات دوره */}

          <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">
            {course.thumbnailUrl && (
              <img
                src={course.thumbnailUrl}
                alt={course.title}
                className="aspect-video w-full object-cover"
              />
            )}

            <div className="p-7">
              <h2 className="text-2xl font-bold">{course.title}</h2>

              {course.shortDescription && (
                <p className="mt-4 leading-7 text-gray-600">
                  {course.shortDescription}
                </p>
              )}

              <div className="mt-6 rounded-2xl bg-gray-50 p-5">
                <div className="text-sm text-gray-500">بعد از پرداخت موفق:</div>

                <ul className="mt-3 space-y-3 text-sm">
                  <li>✅ ثبت‌نام شما در دوره فعال می‌شود</li>

                  <li>✅ درس اول برای شما باز می‌شود</li>

                  <li>✅ پیشرفت دروس ذخیره می‌شود</li>

                  <li>✅ پس از تکمیل دوره وضعیت شما Completed می‌شود</li>
                </ul>
              </div>
            </div>
          </div>

          {/* پرداخت */}

          <div className="h-fit rounded-3xl border bg-white p-7 shadow-sm">
            <h2 className="text-xl font-bold">خلاصه سفارش</h2>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">دوره</span>

                <span className="font-medium">{course.title}</span>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">مبلغ قابل پرداخت</span>

                  <span className="text-2xl font-bold">
                    {course.price.toLocaleString("fa-IR")} تومان
                  </span>
                </div>
              </div>
            </div>

            <EnrollButton
              courseId={course.id}
              price={course.price}
              isLoggedIn={!!session}
            />

            <p className="mt-4 text-center text-xs leading-6 text-gray-400">
              با کلیک روی دکمه پرداخت، به درگاه بانکی منتقل خواهید شد.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
