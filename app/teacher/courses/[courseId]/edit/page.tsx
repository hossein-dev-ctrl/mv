import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

import EditCourseForm from "@/components/teacher/edit-course-form";

type PageProps = {
  params: Promise<{
    courseId: string;
  }>;
};

export default async function EditCoursePage({ params }: PageProps) {
  const session = await getSession();

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
            className="text-sm text-indigo-600"
          >
            ← بازگشت به مدیریت دوره
          </Link>

          <h1 className="mt-5 text-3xl font-bold">ویرایش دوره</h1>

          <p className="mt-2 text-gray-500">اطلاعات دوره را ویرایش کنید.</p>
        </div>

        <EditCourseForm
          course={{
            id: course.id,
            title: course.title,
            shortDescription: course.shortDescription,
            description: course.description,
            thumbnailUrl: course.thumbnailUrl,
            roadmapImageUrl: course.roadmapImageUrl,
            price: course.price,
          }}
        />
      </div>
    </main>
  );
}
