import {getManagementSession} from '@/lib/management-session';
import {prisma} from '@/lib/prisma';
import {prerequisitesInput} from '@/lib/course-prerequisites';
export async function PUT(request:Request,{params}:{params:Promise<{courseId:string}>}){
 const actor=await getManagementSession();if(!actor)return Response.json({message:'ابتدا وارد شوید.'},{status:401});
 const {courseId}=await params;const course=await prisma.course.findUnique({where:{id:courseId}});
 if(!course||(actor.role!=='ADMIN'&&(actor.role!=='TEACHER'||course.teacherId!==actor.userId)))return Response.json({message:'دسترسی ندارید.'},{status:403});
 try{
  const parsed=prerequisitesInput.parse(await request.json());
  const ids=parsed.flatMap(p=>p.courseId?[p.courseId]:[]);
  if(ids.includes(courseId)||new Set(ids).size!==ids.length)throw Error('پیش‌نیاز تکراری یا خود دوره مجاز نیست.');
  const courses=await prisma.course.findMany({where:{id:{in:ids},...(actor.role==='ADMIN'?{}:{OR:[{status:'PUBLISHED'},{teacherId:actor.userId}]})},select:{id:true,title:true}});
  if(courses.length!==ids.length)throw Error('یکی از دوره‌ها در دسترس نیست.');
  const prerequisites=parsed.map(p=>p.courseId?{courseId:p.courseId,title:courses.find(c=>c.id===p.courseId)!.title}:p);
  await prisma.course.update({where:{id:courseId},data:{prerequisites}});return Response.json({success:true});
 }catch(e){return Response.json({message:e instanceof Error?e.message:'پیش‌نیاز نامعتبر است.'},{status:400});}
}
