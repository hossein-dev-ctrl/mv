import {z} from 'zod';
import type {Prisma} from '@prisma/client';
import {prisma} from '@/lib/prisma';
import {notifyCourse,notifyUsers} from '@/lib/notifications';
export type Actor={id:string;role:string};
export const examInput=z.object({title:z.string().trim().min(3).max(150),instructions:z.string().trim().max(5000),questions:z.array(z.string().trim().min(3).max(1000)).min(1).max(30),published:z.boolean(),version:z.number().int().min(0),examWeight:z.number().int().min(0).max(100)});
export const answerInput=z.object({version:z.number().int().positive(),answers:z.array(z.string().trim().min(1).max(5000)).min(1).max(30)});
export const gradeInput=z.object({score:z.number().int().min(0).max(100),feedback:z.string().trim().min(3).max(4000)});
export const noteInput=z.object({note:z.string().trim().max(4000)});
export const courseReviewInput=z.object({authorType:z.enum(['STUDENT','PARENT']),rating:z.number().int().min(1).max(5),body:z.string().trim().min(5).max(4000)});
export function mayManage(actor:Actor,teacherId:string){return actor.role==='ADMIN'||actor.role==='TEACHER'&&actor.id===teacherId;}
export async function finishedLessons(tx:Prisma.TransactionClient,courseId:string,enrollmentId:string){
 const lessons=await tx.lesson.findMany({where:{status:'PUBLISHED',section:{courseId}},select:{id:true,videoUrl:true}});
 const progress=await tx.lessonProgress.findMany({where:{enrollmentId,lessonId:{in:lessons.map(l=>l.id)}},select:{lessonId:true,status:true,videoCompletedAt:true}});
 return lessons.length>0&&lessons.every(l=>progress.some(p=>p.lessonId===l.id&&p.status==='COMPLETED'&&(!l.videoUrl||!!p.videoCompletedAt)));
}
export function finalMark(examScore:number|null,assignmentScores:(number|null)[],weight:number){
 if(examScore===null||assignmentScores.some(s=>s===null))return null;
 if(!assignmentScores.length)return examScore;
 const average=assignmentScores.reduce<number>((sum,s)=>sum+(s??0),0)/assignmentScores.length;
 return Math.round((examScore*weight+average*(100-weight))/100*10)/10;
}
export async function saveExam(actor:Actor,courseId:string,raw:unknown){
 const input=examInput.parse(raw);
 return prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Course" WHERE id=${courseId} FOR UPDATE`;
  const course=await tx.course.findUnique({where:{id:courseId}});
  if(!course||!mayManage(actor,course.teacherId))throw Error('اجازهٔ مدیریت این دوره را ندارید.');
  const existing=await tx.finalExam.findUnique({where:{courseId},include:{_count:{select:{attempts:true}}}});
  if(existing?._count.attempts)throw Error('پس از دریافت پاسخ، آزمون و سهم نمره ثابت می‌ماند.');
  if((existing?.version??0)!==input.version)throw Error('آزمون تغییر کرده؛ صفحه را تازه کنید.');
  const {version,...data}=input;void version;
  const exam=await tx.finalExam.upsert({where:{courseId},create:{courseId,...data},update:{...data,version:{increment:1}}});
  if(exam.published)await notifyCourse(tx,courseId,{title:'آزمون پایانی دوره آماده است',body:exam.title,href:`/dashboard/courses/${courseId}/exam`,eventKey:`exam:${exam.id}:v${exam.version}`});
  return exam;
 });
}
export async function submitExam(actor:Actor,courseId:string,raw:unknown){
 const input=answerInput.parse(raw);
 return prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Course" WHERE id=${courseId} FOR UPDATE`;
  const course=await tx.course.findUnique({where:{id:courseId}});
  let enrollment=await tx.enrollment.findUnique({where:{userId_courseId:{userId:actor.id,courseId}}});
  if(!course||course.status!=='PUBLISHED'||!enrollment||enrollment.status==='CANCELLED'||actor.role==='ADMIN'||course.teacherId===actor.id)throw Error('ثبت‌نام معتبر لازم است.');
  await tx.$queryRaw`SELECT id FROM "Enrollment" WHERE id=${enrollment.id} FOR UPDATE`;
  enrollment=await tx.enrollment.findUnique({where:{id:enrollment.id}});
  if(!enrollment||enrollment.status==='CANCELLED')throw Error('ثبت‌نام دیگر فعال نیست.');
  const existing=await tx.examAttempt.findUnique({where:{enrollmentId:enrollment.id}});
  if(existing)return existing;
  if(!await finishedLessons(tx,courseId,enrollment.id))throw Error('ابتدا همهٔ درس‌ها و ویدئوهای منتشرشده را تکمیل کنید.');
  const exam=await tx.finalExam.findUnique({where:{courseId}});
  if(!exam?.published||exam.version!==input.version)throw Error('آزمون آماده نیست یا تغییر کرده؛ صفحه را تازه کنید.');
  if(input.answers.length!==(exam.questions as string[]).length)throw Error('به همهٔ سؤال‌ها پاسخ دهید.');
  const attempt=await tx.examAttempt.create({data:{examId:exam.id,enrollmentId:enrollment.id,answers:input.answers}});
  await notifyUsers(tx,[course.teacherId],{title:'پاسخ آزمون پایانی',body:course.title,href:`/teacher/courses/${courseId}/exam`,eventKey:`exam-attempt:${attempt.id}`});
  return attempt;
 });
}
export async function gradeExam(actor:Actor,enrollmentId:string,raw:unknown){
 const input=gradeInput.parse(raw);
 return prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Enrollment" WHERE id=${enrollmentId} FOR UPDATE`;
  const e=await tx.enrollment.findUnique({where:{id:enrollmentId},include:{course:true,examAttempt:true}});
  if(!e||!mayManage(actor,e.course.teacherId)||!e.examAttempt)throw Error('پاسخ پیدا نشد یا دسترسی ندارید.');
  if(e.examAttempt.reviewedAt)throw Error('این پاسخ قبلاً نمره گرفته است.');
  const result=await tx.examAttempt.update({where:{id:e.examAttempt.id},data:{...input,reviewedBy:actor.id,reviewedAt:new Date()}});
  await notifyUsers(tx,[e.userId],{title:'نمرهٔ آزمون پایانی ثبت شد',body:e.course.title,href:`/dashboard/courses/${e.courseId}/grades`,eventKey:`exam-grade:${result.id}`});
  return result;
 });
}
export async function saveFinalNote(actor:Actor,enrollmentId:string,raw:unknown){
 const {note}=noteInput.parse(raw);
 return prisma.$transaction(async tx=>{
  const e=await tx.enrollment.findUnique({where:{id:enrollmentId},include:{course:true}});
  if(!e||!mayManage(actor,e.course.teacherId))throw Error('اجازهٔ ثبت بازخورد ندارید.');
  const data=actor.role==='ADMIN'?{adminNote:note,adminUpdatedAt:new Date()}:{teacherNote:note,teacherUpdatedAt:new Date()};
  const result=await tx.finalFeedback.upsert({where:{enrollmentId},create:{enrollmentId,...data},update:data});
  await notifyUsers(tx,[e.userId],{title:actor.role==='ADMIN'?'بازخورد مدیر در کارنامه':'بازخورد مدرس در کارنامه',body:e.course.title,href:`/dashboard/courses/${e.courseId}/grades`,eventKey:`final-note:${result.id}:${actor.role}:${crypto.randomUUID()}`});
  return result;
 });
}
export async function saveCourseReview(actor:Actor,courseId:string,raw:unknown){
 const input=courseReviewInput.parse(raw);
 return prisma.$transaction(async tx=>{
  const e=await tx.enrollment.findUnique({where:{userId_courseId:{userId:actor.id,courseId}},include:{course:true}});
  if(!e||e.status==='CANCELLED'||e.course.status!=='PUBLISHED'||actor.role==='ADMIN'||e.course.teacherId===actor.id||!await finishedLessons(tx,courseId,e.id))throw Error('نظر دوره پس از تکمیل درس‌ها برای ثبت‌نام معتبر باز می‌شود.');
  const review=await tx.courseReview.upsert({where:{enrollmentId:e.id},create:{enrollmentId:e.id,...input},update:input});
  await notifyUsers(tx,[e.course.teacherId],{title:'نظر جدید دربارهٔ دوره',body:e.course.title,href:`/teacher/courses/${courseId}/exam`,eventKey:`course-review:${review.id}:${crypto.randomUUID()}`});
  return review;
 });
}
