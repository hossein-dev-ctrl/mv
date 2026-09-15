export function calculateTeacherShare(amount: number, percent: number | null) {
  if (percent === null) return null;
  if (!Number.isInteger(percent) || percent < 0 || percent > 100 || !Number.isSafeInteger(amount) || amount < 0) {
    throw new Error("درصد یا مبلغ نامعتبر است.");
  }
  return Math.floor(amount * percent / 100);
}

type Enrollment = { userId: string; status: string };
type Payment = { userId: string; status: string; amount: number; isTest: boolean | null; transactionId: string | null; teacherShareAmount: number | null };
export function summarizeFinance(teacherId: string, enrollments: Enrollment[], payments: Payment[]) {
  const students = enrollments.filter(item => item.userId !== teacherId);
  const successes = payments.filter(item => item.status === "SUCCESS" && item.userId !== teacherId);
  const test = successes.filter(item => item.isTest || item.transactionId?.startsWith("MOCK-"));
  const unknown = successes.filter(item => item.isTest === null && !item.transactionId?.startsWith("MOCK-"));
  const real = successes.filter(item => item.isTest === false && !item.transactionId?.startsWith("MOCK-"));
  const allocated = real.filter(item => item.teacherShareAmount !== null);
  const sum = (items: Payment[]) => items.reduce((total, item) => total + item.amount, 0);
  const teacherShare = allocated.reduce((total, item) => total + item.teacherShareAmount!, 0);
  return {
    registrations: students.length,
    active: students.filter(item => item.status !== "CANCELLED").length,
    cancelled: students.filter(item => item.status === "CANCELLED").length,
    sales: sum(real), successfulPayments: real.length, teacherShare,
    platformShare: sum(allocated) - teacherShare,
    unallocated: sum(real.filter(item => item.teacherShareAmount === null)),
    unallocatedCount: real.filter(item => item.teacherShareAmount === null).length,
    unknownSales: sum(unknown), unknownPayments: unknown.length,
    testSales: sum(test), testPayments: test.length,
    selfRegistrations: enrollments.length - students.length,
  };
}
