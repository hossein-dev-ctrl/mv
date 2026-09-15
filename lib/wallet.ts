import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { walletTotals } from "@/lib/wallet-math";

type DB = Pick<Prisma.TransactionClient, "payment" | "payout">;
export async function readWallet(teacherId: string | undefined, db: DB = prisma) {
  const rawSales = await db.payment.findMany({ where: { course: { ...(teacherId ? {teacherId} : {}), ...(process.env.NODE_ENV === "production" ? {demoBatchId:null} : {}) }, ...(teacherId ? {userId:{not:teacherId}} : {}), status: "SUCCESS", isTest: false,
    OR: [{ transactionId: null }, { transactionId: { not: { startsWith: "MOCK-" } } }] },
    select: { id: true, userId: true, amount: true, teacherShareAmount: true, paidAt: true, course: { select: { title: true, teacherId: true, teacher: { select: { role: true } } } }, refund: true, cost: true } });
  const sales = teacherId ? rawSales : rawSales.filter(sale=>sale.userId!==sale.course.teacherId).map(sale=>sale.course.teacher.role==="TEACHER" ? sale : ({...sale,teacherShareAmount:0,refund:sale.refund?{...sale.refund,teacherDebit:0}:null}));
  const payouts = await db.payout.findMany({ where: { ...(teacherId ? {teacherId} : {}), ...(process.env.NODE_ENV === "production" ? {teacher:{demoBatchId:null}} : {}) }, include:{reviews:{orderBy:{createdAt:"asc"}}}, orderBy: { requestedAt: "desc" } });
  return {sales,payouts,totals:walletTotals(sales,payouts)};
}
