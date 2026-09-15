import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { summarizeFinance } from "@/lib/finance-math";

export async function requireFinanceUser(adminOnly = false) {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, role: true, teacherSharePercent: true } });
  if (!user || user.role !== session.role) redirect("/login");
  if (adminOnly ? user.role !== "ADMIN" : user.role !== "ADMIN" && user.role !== "TEACHER") redirect("/dashboard");
  return user;
}

export async function getFinanceCourses(teacherId?: string) {
  const courses = await prisma.course.findMany({
    where: teacherId ? { teacherId } : {}, orderBy: { createdAt: "desc" },
    select: {
      id: true, title: true, teacherId: true,
      teacher: { select: { name: true, email: true, phone: true, teacherSharePercent: true } },
      enrollments: { select: { userId: true, status: true } },
      payments: { select: { userId: true, status: true, amount: true, isTest: true, transactionId: true, teacherShareAmount: true } },
    },
  });
  return courses.map(({ enrollments, payments, ...course }) => ({ ...course, totals: summarizeFinance(course.teacherId, enrollments, payments) }));
}

export function totalFinance(courses: Awaited<ReturnType<typeof getFinanceCourses>>) {
  return courses.reduce((totals, course) => {
    for (const key of Object.keys(totals) as (keyof typeof totals)[]) totals[key] += course.totals[key];
    return totals;
  }, summarizeFinance("", [], []));
}
