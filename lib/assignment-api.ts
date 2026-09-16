import {getSession} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
export async function assignmentActor(){
 const session=await getSession();if(!session)return null;
 const user=await prisma.user.findUnique({where:{id:session.userId},select:{id:true,role:true,demoBatchId:true}});
 if(!user||user.role!==session.role||(user.demoBatchId&&process.env.NODE_ENV==='production'))return null;
 return user;
}
export function assignmentError(error:unknown){return Response.json({message:(error as {code?:string})?.code?'ثبت انجام نشد؛ صفحه را تازه کنید و دوباره بررسی کنید.':error instanceof Error?error.message:'عملیات انجام نشد.'},{status:409});}
