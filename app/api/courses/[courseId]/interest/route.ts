import {getSession} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import {latinDigits} from '@/lib/persian-numbers';
import {z} from 'zod';
import {notifyAdmins,notifyUsers} from '@/lib/notifications';
const input=z.object({name:z.string().trim().min(3).max(100),phone:z.string().transform(v=>latinDigits(v).replace(/[\s-]/g,'')).pipe(z.string().regex(/^09\d{9}$/)),consent:z.literal(true)});
export async function POST(request:Request,{params}:{params:Promise<{courseId:string}>}){
 const session=await getSession();if(!session)return Response.json({message:'ابتدا وارد حساب شوید.'},{status:401});
 const body=input.safeParse(await request.json().catch(()=>null));if(!body.success)return Response.json({message:'نام، موبایل معتبر و رضایت اطلاع‌رسانی لازم است.'},{status:400});
 const {courseId}=await params;
 const user=await prisma.user.findUnique({where:{id:session.userId},select:{id:true,role:true}});
 if(!user||user.role!==session.role)return Response.json({message:'دوباره وارد شوید.'},{status:401});
 const course=await prisma.course.findUnique({where:{id:courseId},select:{status:true,deliveryStatus:true,teacherId:true}});
 if(!course||course.status!=='PUBLISHED'||course.deliveryStatus!=='UPCOMING')return Response.json({message:'پیش‌ثبت‌نام این دوره فعال نیست.'},{status:400});
 if(course.teacherId===user.id||user.role==='ADMIN')return Response.json({message:'این فرم برای متقاضیان دوره است.'},{status:403});
 await prisma.$transaction(async tx=>{
  const interest=await tx.courseInterest.upsert({where:{courseId_userId:{courseId,userId:user.id}},create:{courseId,userId:user.id,name:body.data.name,phone:body.data.phone},update:{}});
  const notice={title:'درخواست پیش‌ثبت‌نام جدید',body:'یک متقاضی جدید برای دوره ثبت شده است.',href:`/teacher/courses/${courseId}/interests`,eventKey:`interest:${interest.id}`};
  await notifyUsers(tx,[course.teacherId],notice);await notifyAdmins(tx,{...notice,scope:'SYSTEM'});
 });
 return Response.json({message:'درخواست ثبت شد؛ پس از مشخص شدن زمان برگزاری امکان اطلاع‌رسانی وجود دارد.'});
}
