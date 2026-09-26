
import ThemeIcon from '@/components/panel/theme-icon';
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getManagementSession } from "@/lib/management-session";

import EditCourseForm from "@/components/teacher/edit-course-form";

type PageProps = {
  params: Promise<{
    courseId: string;
  }>;
};

export default async function EditCoursePage({ params }: PageProps) {
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
  });

  if (!course) {
    notFound();
  }

  if (session.role !== "ADMIN" && course.teacherId !== session.userId) {
    redirect("/teacher");
  }

  return (
    <main dir="rtl" className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Link
            href={`/teacher/courses/${course.id}`}
            className="panel-action panel-action-indigo"
          ><ThemeIcon name="arrow" className="me-2 h-4 w-4"/> بازگشت به مدیریت دوره
          </Link>

          <h1 className="mt-5 text-3xl font-bold">ویرایش دوره</h1>

          <p className="mt-2 text-gray-500">اطلاعات دوره را ویرایش کنید.</p>
        </div>

        <EditCourseForm
          course={{
            id: course.id,
            deliveryStatus:course.deliveryStatus,
            teacherIntro:course.teacherIntro,
            title: course.title,
            shortDescription: course.shortDescription,
            description: course.description,
            thumbnailUrl: course.thumbnailUrl,
            roadmapImageUrl: course.roadmapImageUrl,
            price: course.price,
            discountPercent: course.discountPercent,
          }}
        />
      </div>
    </main>
  );
}
