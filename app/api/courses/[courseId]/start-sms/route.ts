import {getManagementSession} from '@/lib/management-session';
import {prisma} from '@/lib/prisma';
import {processCourseStartSms,prepareCourseStart} from '@/lib/course-start-sms';
export const maxDuration=60;
export async function POST(request:Request,{params}:{params:Promise<{courseId:string}>}){
 const actor=await getManagementSession();if(!actor)return Response.json({message:'ابتدا وارد شوید.'},{status:401});
 const {courseId}=await params;const course=await prisma.course.findUnique({where:{id:courseId}});
 if(!course||actor.role!=='ADMIN')return Response.json({message:'دسترسی ندارید.'},{status:403});
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({message:'درخواست نامعتبر.'},{status:403});
 const body=await request.json().catch(()=>({}));
 if(body.retryId){if(typeof body.retryId!=='string'||body.confirmRetry!==true)return Response.json({message:'تأیید تلاش مجدد لازم است.'},{status:400});await prisma.courseStartSms.updateMany({where:{id:body.retryId,interest:{courseId},status:{in:['FAILED','UNKNOWN']}},data:{status:'PENDING',lastError:null}});}
 try{if(body.prepare===true)await prisma.$transaction(tx=>prepareCourseStart(tx,courseId,typeof body.code==='string'?body.code.trim().toUpperCase():''));return Response.json(await processCourseStartSms(courseId));}catch(error){return Response.json({message:error instanceof Error?error.message:'خطا در آماده‌سازی پیامک'},{status:400});}
}
