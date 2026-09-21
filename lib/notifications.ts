import type {Prisma} from '@prisma/client';

type Notice = {title:string;body:string;href:string;eventKey:string};
export async function notifyUsers(tx:Prisma.TransactionClient, userIds:string[], notice:Notice) {
 const ids=Array.from(new Set(userIds));
 // Keep individual INSERTs bounded, including admin broadcasts.
 for(let i=0;i<ids.length;i+=500) await tx.notification.createMany({
  data:ids.slice(i,i+500).map(userId=>({userId,...notice})),skipDuplicates:true,
 });
}
export async function notifyAdmins(tx:Prisma.TransactionClient, notice:Notice, excludeId?:string) {
 const admins=await tx.user.findMany({where:{role:'ADMIN',demoBatchId:null,...(excludeId?{id:{not:excludeId}}:{})},select:{id:true}});
 await notifyUsers(tx,admins.map(u=>u.id),notice);
}
export async function notifyCourse(tx:Prisma.TransactionClient, courseId:string, notice:Notice) {
 const enrollments=await tx.enrollment.findMany({where:{courseId,status:{in:['ACTIVE','COMPLETED']},user:{demoBatchId:null,role:{not:'ADMIN'}},course:{status:'PUBLISHED'}},select:{userId:true}});
 await notifyUsers(tx,enrollments.map(e=>e.userId),notice);
}
export async function notifyLessonPublished(tx:Prisma.TransactionClient, lessonId:string) {
 const lesson=await tx.lesson.findUnique({where:{id:lessonId},include:{section:{include:{course:true}},assignment:true}});
 if(!lesson||lesson.status!=='PUBLISHED'||lesson.section.course.status!=='PUBLISHED')return;
 const course=lesson.section.course;
 await notifyCourse(tx,course.id,{title:'درس جدید در دورهٔ شما',body:`${lesson.title} · ${course.title}`,href:`/courses/${course.slug}`,eventKey:`lesson:${lesson.id}:published`});
 if(lesson.assignment?.published)await notifyCourse(tx,course.id,{title:'تکلیف جدید در دورهٔ شما',body:lesson.assignment.title,href:`/courses/${course.slug}`,eventKey:`assignment:${lesson.assignment.id}:v${lesson.assignment.version}`});
}
