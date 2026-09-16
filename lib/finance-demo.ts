import { randomBytes, randomInt } from 'node:crypto';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
export function demoEnabled(){return process.env.NODE_ENV==='development';}
export async function createFinanceDemo(ownerId:string) {
 if(!demoEnabled())throw new Error('فقط در محیط توسعه مجاز است.');
 const password='Demo-'+randomBytes(12).toString('hex');const passwordHash=await hash(password,10);
 return prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "User" WHERE id=${ownerId} FOR UPDATE`;
  if(await tx.demoBatch.findUnique({where:{ownerId}}))throw new Error('بستهٔ تست موجود است؛ ابتدا همان را پاک کنید.');
  const batchId='finance-demo-'+randomBytes(8).toString('hex');
  const teacher=await tx.user.create({data:{name:'مدرس آزمایشی مالی',role:'TEACHER',phone:'000'+String(randomInt(10000000,99999999)),email:batchId+'@example.test',passwordHash,teacherSharePercent:70,demoBatchId:batchId}});
  const minimum=(await tx.financeSettings.findUnique({where:{id:'main'}}))?.minimumPayout??100000;
  const amount=Math.min(2000000000,Math.max(500000,minimum*2));
  const course=await tx.course.create({data:{teacherId:teacher.id,title:'دورهٔ آزمایشی دفتر مالی',slug:batchId,status:'DRAFT',price:amount,demoBatchId:batchId}});
  for(let i=0;i<6;i++) {
   const student=await tx.user.create({data:{name:`دانش‌آموز آزمایشی ${i+1}`,role:'STUDENT',demoBatchId:batchId}});
   const saleAmount=Math.min(2000000000,amount+i*10000);
   const paidAt=new Date();paidAt.setUTCDate(Math.min(15,paidAt.getUTCDate()));paidAt.setUTCMonth(paidAt.getUTCMonth()-i);
   // These artificial sales belong only to the marked, non-public demo course.
   // isTest=false lets the development-only demo exercise the real ledger rules.
   await tx.payment.create({data:{userId:student.id,courseId:course.id,amount:saleAmount,status:'SUCCESS',isTest:false,transactionId:`DEMO-${batchId}-${i}`,teacherSharePercent:70,teacherShareAmount:Math.floor(saleAmount*.7),paidAt,createdAt:paidAt}});
   await tx.enrollment.create({data:{userId:student.id,courseId:course.id}});
  }
  await tx.demoBatch.create({data:{id:batchId,ownerId,teacherId:teacher.id}});
  return {phone:teacher.phone,password,iban:'IR062960000000100324200001',message:'شش پرداخت آزمایشی ساخته شد. مشخصات ورود را پیش از تازه‌سازی صفحه نگه دارید.'};
 },{timeout:15000});
}
export async function clearFinanceDemo(ownerId:string) {
 if(!demoEnabled())throw new Error('فقط در محیط توسعه مجاز است.');
 return prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "User" WHERE id=${ownerId} FOR UPDATE`;
  const batch=await tx.demoBatch.findUnique({where:{ownerId}});if(!batch)return 'دادهٔ تستی متعلق به شما وجود ندارد.';
  await tx.$queryRaw`SELECT id FROM "User" WHERE id=${batch.teacherId} FOR UPDATE`;
  const users=await tx.user.findMany({where:{demoBatchId:batch.id},select:{id:true}});const userIds=users.map(u=>u.id);
  const courses=await tx.course.findMany({where:{demoBatchId:batch.id},select:{id:true,teacherId:true}});const courseIds=courses.map(c=>c.id);
  if(userIds.includes(ownerId)||courses.some(c=>!userIds.includes(c.teacherId)))throw new Error('وابستگی خارج از بسته وجود دارد؛ حذف متوقف شد.');
  const outside=await tx.course.count({where:{teacherId:{in:userIds},NOT:{demoBatchId:batch.id}}});
  const foreignPayments=await tx.payment.count({where:{OR:[{courseId:{in:courseIds},userId:{notIn:userIds}},{userId:{in:userIds},courseId:{notIn:courseIds}}]}});
  const foreignEnrollments=await tx.enrollment.count({where:{OR:[{courseId:{in:courseIds},userId:{notIn:userIds}},{userId:{in:userIds},courseId:{notIn:courseIds}}]}});
  const foreignInterests=await tx.courseInterest.count({where:{OR:[{courseId:{in:courseIds},userId:{notIn:userIds}},{userId:{in:userIds},courseId:{notIn:courseIds}}]}});
  if(outside||foreignPayments||foreignEnrollments||foreignInterests)throw new Error('بسته به داده‌ای خارج از تست متصل است؛ برای حفظ اطلاعات، حذف انجام نشد.');
  const payments=await tx.payment.findMany({where:{courseId:{in:courseIds},userId:{in:userIds}},select:{id:true}});const ids=payments.map(p=>p.id);
  await tx.paymentRefund.deleteMany({where:{paymentId:{in:ids}}});await tx.paymentCost.deleteMany({where:{paymentId:{in:ids}}});
  await tx.payout.deleteMany({where:{teacherId:{in:userIds}}});
  await tx.payment.deleteMany({where:{id:{in:ids}}});
  await tx.submission.deleteMany({where:{assignment:{lesson:{section:{courseId:{in:courseIds}}}},enrollment:{userId:{in:userIds}}}});
  await tx.enrollment.deleteMany({where:{courseId:{in:courseIds},userId:{in:userIds}}});
  await tx.course.deleteMany({where:{id:{in:courseIds},demoBatchId:batch.id}});
  await tx.user.deleteMany({where:{id:{in:userIds},demoBatchId:batch.id}});
  await tx.demoBatch.delete({where:{id:batch.id}});
  return 'فقط حساب‌ها، دوره‌ها و سوابق بستهٔ آزمایشی شما پاک شدند. تنظیمات اصلی تغییر نکردند.';
 },{timeout:15000});
}
