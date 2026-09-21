import {communicationActor} from '@/lib/communication';
import {prisma} from '@/lib/prisma';
import {z} from 'zod';
export async function POST(request:Request){
 const actor=await communicationActor();if(!actor)return Response.json({message:'دوباره وارد شوید.'},{status:401});
 const body=z.union([z.object({id:z.string().min(1).max(100)}),z.object({all:z.literal(true)})]).safeParse(await request.json().catch(()=>null));
 if(!body.success)return Response.json({message:'درخواست نامعتبر است.'},{status:400});
 const result=await prisma.notification.updateMany({where:{userId:actor.userId,readAt:null,...('id' in body.data?{id:body.data.id}:{})},data:{readAt:new Date()}});
 return Response.json({count:result.count});
}
