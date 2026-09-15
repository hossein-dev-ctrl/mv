import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Authorize before loading any enrollment or student data, including direct URLs.
export async function getTeacherCourse(courseId: string) {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.userId }, select: { role: true },
  });
  if (!user || user.role !== session.role) redirect("/login");
  if (user.role !== "TEACHER" && user.role !== "ADMIN") redirect("/dashboard");
  const course = await prisma.course.findFirst({
    where: { id: courseId, ...(user.role === "ADMIN" ? {} : { teacherId: session.userId }) },
    select: {
      id: true, title: true, status: true,
      sections: {
        orderBy: { order: "asc" },
        select: { id: true, title: true, lessons: {
          where: { status: "PUBLISHED" }, orderBy: { order: "asc" },
          select: { id: true, title: true },
        } },
      },
    },
  });
  if (!course) notFound();
  return course;
}

export const enrollmentLabels = {
  ACTIVE: "فعال", COMPLETED: "تکمیل‌شده", CANCELLED: "لغوشده",
} as const;

export function parseStudentFilters(params: Record<string, string | string[] | undefined>) {
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const status = typeof params.status === "string" &&
    ["ACTIVE", "COMPLETED", "CANCELLED"].includes(params.status)
    ? params.status as keyof typeof enrollmentLabels : undefined;
  const rawPage = typeof params.page === "string" ? Number(params.page) : 1;
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  return { q, status, page };
}

export function formatStudentDate(date: Date | null) {
  return date ? new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium", timeZone: "Asia/Tehran",
  }).format(date) : "—";
}
