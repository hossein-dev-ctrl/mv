import {prisma} from '@/lib/prisma';
import {finalMark,finishedLessons,mayManage,type Actor} from '@/lib/final-assessment';
import {notifyUsers} from '@/lib/notifications';
export const CERTIFICATE_PASS_SCORE=60;
export async function issueCertificate(actor:Actor,enrollmentId:string){
 return prisma.$transaction(async tx=>{
  const original=await tx.enrollment.findUnique({where:{id:enrollmentId}});if(!original)throw Error('ثبت‌نام پیدا نشد.');
  await tx.$queryRaw`SELECT id FROM "Course" WHERE id=${original.courseId} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "Enrollment" WHERE id=${enrollmentId} FOR UPDATE`;
  const e=await tx.enrollment.findUniqueOrThrow({where:{id:enrollmentId},include:{user:true,course:{include:{finalExam:true}},examAttempt:true,certificate:true}});
  if(actor.id!==e.userId&&!mayManage(actor,e.course.teacherId))throw Error('دسترسی ندارید.');
  if(e.status==='CANCELLED'||e.user.role==='ADMIN'||e.userId===e.course.teacherId||e.user.demoBatchId||e.course.demoBatchId)throw Error('ثبت‌نام معتبر لازم است.');
  if(e.certificate){if(e.certificate.revokedAt)throw Error('گواهی توسط مدیر باطل شده است.');return e.certificate;}
  if(e.course.status!=='PUBLISHED'||!e.course.finalExam?.published)throw Error('دوره و آزمون باید منتشرشده باشند.');
  if(!e.user.name?.trim())throw Error('ابتدا نام خود را از بخش ورود تکمیل کنید.');
  if(!await finishedLessons(tx,e.courseId,e.id))throw Error('همهٔ درس‌ها و ویدئوها باید تکمیل شوند.');
  const assignments=await tx.assignment.findMany({where:{published:true,lesson:{status:'PUBLISHED',section:{courseId:e.courseId}}},include:{submissions:{where:{enrollmentId,isLatest:true},take:1}}});
  const score=finalMark(e.examAttempt?.score??null,assignments.map(a=>a.submissions[0]?.status==='GRADED'?a.submissions[0].score:null),e.course.finalExam.examWeight);
  if(score===null||score<CERTIFICATE_PASS_SCORE||e.examAttempt?.score==null||e.examAttempt.score<CERTIFICATE_PASS_SCORE)throw Error('نمرهٔ آزمون و نمرهٔ نهایی باید حداقل ۶۰ باشند و همهٔ تمرین‌ها تصحیح شده باشند.');
  const certificate=await tx.certificate.create({data:{enrollmentId,studentName:e.user.name.trim(),courseTitle:e.course.title,score}});
  await notifyUsers(tx,[e.userId],{title:'گواهی‌نامهٔ پایان دوره صادر شد',body:e.course.title,href:`/certificates/${certificate.id}`,eventKey:`certificate:${certificate.id}`});
  return certificate;
 },{isolationLevel:'Serializable'});
}
export function certificateValid(certificate:{revokedAt:Date|null;enrollment:{status:string}}){return !certificate.revokedAt&&certificate.enrollment.status!=='CANCELLED';}
