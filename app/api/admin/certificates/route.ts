import {adminRequest} from '@/lib/admin-request';
import {prisma} from '@/lib/prisma';
import {notifyUsers} from '@/lib/notifications';
export async function POST(request:Request){
 try{await adminRequest(request);}catch{return Response.json({message:'دسترسی ندارید.'},{status:403});}
 try{const {id}=await request.json();if(typeof id!=='string')throw Error('شناسه نامعتبر');await prisma.$transaction(async tx=>{const c=await tx.certificate.findUniqueOrThrow({where:{id},include:{enrollment:true}});if(c.revokedAt)return;await tx.certificate.update({where:{id},data:{revokedAt:new Date()}});await notifyUsers(tx,[c.enrollment.userId],{title:'گواهی‌نامه باطل شد',body:'برای اطلاع از علت با پشتیبانی ارتباط بگیرید.',href:`/certificates/${id}`,eventKey:`certificate:${id}:revoked`});});return Response.json({success:true});}catch{return Response.json({message:'گواهی پیدا نشد.'},{status:400});}
}
