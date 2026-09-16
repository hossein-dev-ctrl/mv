import {z} from 'zod';
import {prisma} from '@/lib/prisma';
import {getLessonAccess} from '@/lib/lesson-access';
export type AssignmentActor={id:string;role:string};
export const assignmentInput=z.object({title:z.string().trim().min(3).max(150),instructions:z.string().trim().min(10).max(10000),published:z.boolean(),version:z.number().int().min(0)});
export const submissionInput=z.object({answer:z.string().trim().min(3).max(12000),projectUrl:z.string().trim().max(2000).refine(value=>{if(!value)return true;try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}},'لینک پروژه باید یک آدرس HTTPS معتبر باشد.').default(''),version:z.number().int().positive()});
export const reviewInput=z.discriminatedUnion('action',[
 z.object({action:z.literal('grade'),score:z.number().int().min(0).max(100),feedback:z.string().trim().min(3).max(4000)}),
 z.object({action:z.literal('revision'),feedback:z.string().trim().min(3).max(4000)}),
]);
export async function saveAssignment(actor:AssignmentActor,lessonId:string,input:z.infer<typeof assignmentInput>) {
 if(!['TEACHER','ADMIN'].includes(actor.role))throw Error('اجازهٔ تعریف تکلیف ندارید.');
 return prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Lesson" WHERE id=${lessonId} FOR UPDATE`;
  const lesson=await tx.lesson.findUnique({where:{id:lessonId},select:{section:{select:{course:{select:{teacherId:true}}}}}});
  if(!lesson||(actor.role!=='ADMIN'&&lesson.section.course.teacherId!==actor.id))throw Error('اجازهٔ مدیریت این درس را ندارید.');
  // The lesson lock serializes first creation; the assignment lock also serializes submissions.
  const existing=await tx.assignment.findUnique({where:{lessonId}});
  if(existing)await tx.$queryRaw`SELECT id FROM "Assignment" WHERE id=${existing.id} FOR UPDATE`;
  const current=await tx.assignment.findUnique({where:{lessonId}});
  if((current?.version??0)!==input.version)throw Error('تکلیف در پنجرهٔ دیگری تغییر کرده؛ صفحه را تازه کنید.');
  const data={title:input.title,instructions:input.instructions,published:input.published};
  return current?tx.assignment.update({where:{id:current.id},data:{...data,version:{increment:1}}}):tx.assignment.create({data:{lessonId,...data}});
 });
}
export async function submitAssignment(actor:AssignmentActor,lessonId:string,input:z.infer<typeof submissionInput>) {
 if(actor.role==='ADMIN')throw Error('مدیر نمی‌تواند پاسخ دانش‌آموز ثبت کند.');
 const access=await getLessonAccess(actor.id,lessonId);
 if(!access.allowed)throw Error('درس برای شما باز نیست یا ثبت‌نام معتبر ندارید.');
 const enrollmentId=access.enrollment!.id;
 return prisma.$transaction(async tx=>{
  const initial=await tx.assignment.findUnique({where:{lessonId}});
  if(!initial)throw Error('تکلیف پیدا نشد.');
  await tx.$queryRaw`SELECT id FROM "Assignment" WHERE id=${initial.id} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "Enrollment" WHERE id=${enrollmentId} FOR UPDATE`;
  const currentAccess=await getLessonAccess(actor.id,lessonId,tx);
  if(!currentAccess.allowed)throw Error("دسترسی درس تغییر کرده است؛ صفحه را تازه کنید.");
  const assignment=await tx.assignment.findUnique({where:{lessonId},include:{lesson:{include:{section:{include:{course:true}}}}}});
  const enrollment=await tx.enrollment.findUnique({where:{id:enrollmentId}});
  if(!assignment?.published||assignment.lesson.status!=='PUBLISHED'||assignment.lesson.section.course.status!=='PUBLISHED'||!enrollment||enrollment.userId!==actor.id||enrollment.status==='CANCELLED'||enrollment.courseId!==assignment.lesson.section.courseId||assignment.lesson.section.course.teacherId===actor.id)throw Error('دسترسی ارسال پاسخ فعال نیست.');
  if(assignment.version!==input.version)throw Error('صورت تکلیف تغییر کرده؛ صفحه را تازه کنید و دوباره بررسی کنید.');
  const latest=await tx.submission.findFirst({where:{assignmentId:assignment.id,enrollmentId:enrollment.id},orderBy:{attempt:'desc'}});
  if(latest&&latest.status!=='REVISION')throw Error('پاسخ شما ثبت شده؛ ارسال مجدد فقط پس از درخواست اصلاح مدرس ممکن است.');
  if(latest)await tx.submission.updateMany({where:{id:latest.id,isLatest:true},data:{isLatest:false}});
  return tx.submission.create({data:{assignmentId:assignment.id,enrollmentId:enrollment.id,attempt:(latest?.attempt??0)+1,answer:input.answer,projectUrl:input.projectUrl||null,assignmentTitle:assignment.title,assignmentInstructions:assignment.instructions}});
 });
}
export async function reviewSubmission(actor:AssignmentActor,id:string,input:z.infer<typeof reviewInput>) {
 if(!['ADMIN','TEACHER'].includes(actor.role))throw Error('اجازهٔ ارزیابی ندارید.');
 return prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Submission" WHERE id=${id} FOR UPDATE`;
  const submission=await tx.submission.findUnique({where:{id},include:{assignment:{include:{lesson:{include:{section:{include:{course:true}}}}}}}});
  if(!submission||(actor.role!=='ADMIN'&&submission.assignment.lesson.section.course.teacherId!==actor.id))throw Error('پاسخ پیدا نشد یا دسترسی ندارید.');
  if(submission.status!=='PENDING'||submission.isLatest===false)throw Error('این پاسخ قبلاً بررسی شده است؛ صفحه را تازه کنید.');
  return tx.submission.update({where:{id},data:{status:input.action==='grade'?'GRADED':'REVISION',score:input.action==='grade'?input.score:null,feedback:input.feedback,reviewedAt:new Date(),reviewedBy:actor.id}});
 });
}
