
import ThemeIcon from '@/components/panel/theme-icon';
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getManagementSession } from "@/lib/management-session";

import CreateLessonForm from "@/components/teacher/create-lesson-form";

type PageProps = {
  params: Promise<{
    courseId: string;
    sectionId: string;
  }>;
};

export default async function NewLessonPage({ params }: PageProps) {
  const session = await getManagementSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "TEACHER" && session.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { courseId, sectionId } = await params;

  const section = await prisma.courseSection.findFirst({
    where: {
      id: sectionId,
      courseId,
      ...(session.role === "ADMIN" ? {} : { course: { teacherId: session.userId } }),
    },
    include: {
      course: true,
    },
  });

  if (!section) {
    notFound();
  }

  if (session.role !== "ADMIN" && section.course.teacherId !== session.userId) {
    redirect("/teacher");
  }

  return (
    <main dir="rtl" className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/teacher/courses/${courseId}/sections/${sectionId}`}
          className="panel-action panel-action-indigo"
        ><ThemeIcon name="arrow" className="me-2 h-4 w-4"/> بازگشت به فصل
        </Link>

        <div className="mb-8 mt-5">
          <p className="text-sm text-gray-400">{section.course.title}</p>

          <h1 className="mt-2 text-3xl font-bold">ایجاد درس جدید</h1>

          <p className="mt-2 text-gray-500">فصل: {section.title}</p>
        </div>

        <CreateLessonForm courseId={courseId} sectionId={sectionId} />
      </div>
    </main>
  );
}
