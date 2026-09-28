import {getManagementSession} from '@/lib/management-session';
import {prisma} from '@/lib/prisma';
import {normalizePhone} from '@/lib/otp-policy';
export async function DELETE(request:Request){
 const actor=await getManagementSession();if(actor?.role!=='ADMIN')return Response.json({message:'دسترسی ندارید.'},{status:403});
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({message:'درخواست نامعتبر.'},{status:403});
 try{const phone=normalizePhone((await request.json()).phone);await prisma.$transaction(async tx=>{await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`otp:${phone}`}))`;await tx.loginOtp.updateMany({where:{phone},data:{blockedAt:null,consecutiveFailures:0,attempts:0,digest:null,challengeId:null,expiresAt:null}});});return Response.json({success:true});}catch{return Response.json({message:'شماره نامعتبر است.'},{status:400});}
}
