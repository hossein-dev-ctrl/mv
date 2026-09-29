import type {Prisma} from '@prisma/client';
import {prisma} from '@/lib/prisma';
import {sendSms} from '@/lib/sms';
import {normalizePhone} from '@/lib/otp-policy';
export function startTransition(previous:string,current:string){return previous==='UPCOMING'&&current==='ONGOING';}
// Call inside the course update transaction with the course row already locked.
export async function queueCourseStart(tx:Prisma.TransactionClient,courseId:string,previousDelivery?:string){
 let course=await tx.course.findUniqueOrThrow({where:{id:courseId}});
 if(previousDelivery&&startTransition(previousDelivery,course.deliveryStatus))course=await tx.course.update({where:{id:courseId},data:{launchSmsPending:true}});
 if(course.status!=='PUBLISHED'||course.deliveryStatus!=='ONGOING'||!course.launchSmsPending)return 0;
 const interests=await tx.courseInterest.findMany({where:{courseId},select:{id:true,phone:true}});
 const base=process.env.PUBLIC_SITE_URL?.replace(/\/$/,'');
 const link=base&&/^https?:\/\//.test(base)?`\n${base}/courses/${encodeURIComponent(course.slug)}`:'';
 const message=`دورهٔ «${course.title.slice(0,150)}» آغاز شد. برای مشاهده و ثبت‌نام به سایت آموزش مراجعه کنید.${link}`;
 const result=await tx.courseStartSms.createMany({data:interests.map(i=>({interestId:i.id,phone:i.phone,message})),skipDuplicates:true});
 await tx.course.update({where:{id:courseId},data:{launchSmsPending:false}});
 return result.count;
}
export async function processCourseStartSms(courseId?:string){
 if(!process.env.FARAZ_SMS_API_KEY||!process.env.FARAZ_SMS_LINE_NUMBER)return {processed:0,configured:false};
 // A crashed worker may already have sent the SMS. Do not retry ambiguous deliveries automatically.
 await prisma.courseStartSms.updateMany({where:{status:'SENDING',claimedAt:{lt:new Date(Date.now()-300000)},...(courseId?{interest:{courseId}}:{})},data:{status:'UNKNOWN',lastError:'نتیجهٔ ارسال قبلی نامشخص است؛ پنل پیامکی را بررسی کنید.'}});
 let processed=0;
 for(let n=0;n<3;n++){
  const job=await prisma.$transaction(async tx=>{
   const rows=courseId?await tx.$queryRaw<{id:string}[]>`SELECT s.id FROM "CourseStartSms" s JOIN "CourseInterest" i ON i.id=s."interestId" JOIN "Course" c ON c.id=i."courseId" WHERE s.status='PENDING' AND c.status='PUBLISHED' AND c."deliveryStatus"='ONGOING' AND c.id=${courseId} ORDER BY s."createdAt" FOR UPDATE OF s SKIP LOCKED LIMIT 1`:await tx.$queryRaw<{id:string}[]>`SELECT s.id FROM "CourseStartSms" s JOIN "CourseInterest" i ON i.id=s."interestId" JOIN "Course" c ON c.id=i."courseId" WHERE s.status='PENDING' AND c.status='PUBLISHED' AND c."deliveryStatus"='ONGOING' ORDER BY s."createdAt" FOR UPDATE OF s SKIP LOCKED LIMIT 1`;
   if(!rows.length)return null;
   return tx.courseStartSms.update({where:{id:rows[0].id},data:{status:'SENDING',claimedAt:new Date(),attempts:{increment:1}},include:{interest:{include:{course:{select:{title:true,slug:true}}}}}});
  });
  if(!job)break;
  let phone:string;
  try{phone=normalizePhone(job.phone);}catch{await prisma.courseStartSms.update({where:{id:job.id},data:{status:'FAILED',lastError:'شمارهٔ ثبت‌شده معتبر نیست.'}});processed++;continue;}
  try{
   const pattern=process.env.FARAZ_SMS_COURSE_START_PATTERN;
   const result=await sendSms(pattern?{type:'pattern',phone,patternCode:pattern,variables:{[process.env.FARAZ_SMS_COURSE_START_VARIABLE||'course']:job.interest.course.title}}:{type:'simple',phone,message:job.message});
   if(String(result.status).toLowerCase()!=='success')await prisma.courseStartSms.update({where:{id:job.id},data:{status:'FAILED',lastError:'سرویس پیامکی ارسال را نپذیرفت.'}});
   else await prisma.courseStartSms.update({where:{id:job.id},data:{status:'SENT',sentAt:new Date(),lastError:null}});
  }catch{await prisma.courseStartSms.update({where:{id:job.id},data:{status:'UNKNOWN',lastError:'نتیجهٔ ارسال قطعی نیست؛ پیش از تلاش مجدد پنل پیامکی را بررسی کنید.'}});}
  processed++;
 }
 return {processed,configured:true};
}
