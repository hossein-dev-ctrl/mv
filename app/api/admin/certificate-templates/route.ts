import {z} from 'zod';
import {adminRequest} from '@/lib/admin-request';
import {prisma} from '@/lib/prisma';
import {templateInput} from '@/lib/certificate-templates';
export async function POST(request:Request){
 try{await adminRequest(request);}catch{return Response.json({message:'دسترسی ندارید.'},{status:403});}
 try{const raw=await request.json();const data=templateInput.parse(raw);
 const id=z.string().min(1).max(100).optional().parse(raw.id);
 const template=id?await prisma.certificateTemplate.update({where:{id},data}):await prisma.certificateTemplate.create({data});
 return Response.json({id:template.id,message:'قالب ذخیره شد؛ برای صدور جدید آن را به دوره اختصاص دهید.'});
 }catch{return Response.json({message:'اطلاعات قالب معتبر نیست یا قالب پیدا نشد.'},{status:400});}
}
export async function PATCH(request:Request){
 try{await adminRequest(request);}catch{return Response.json({message:'دسترسی ندارید.'},{status:403});}
 try{const {courseId,templateId}=z.object({courseId:z.string().min(1).max(100),templateId:z.string().min(1).max(100).nullable()}).parse(await request.json());
 await prisma.$transaction(async tx=>{await tx.$queryRaw`SELECT id FROM "Course" WHERE id=${courseId} FOR UPDATE`;if(templateId&&!await tx.certificateTemplate.findFirst({where:{id:templateId,active:true}}))throw Error('قالب غیرفعال');await tx.course.update({where:{id:courseId},data:{certificateTemplateId:templateId}});});
 return Response.json({message:'قالب دوره ذخیره شد. مدارک قبلی تغییر نمی‌کنند.'});
 }catch{return Response.json({message:'دوره یا قالب فعال پیدا نشد.'},{status:400});}
}
