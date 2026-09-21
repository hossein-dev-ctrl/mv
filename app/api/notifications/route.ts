import {communicationActor} from '@/lib/communication';
import {prisma} from '@/lib/prisma';
export async function GET(){
 const actor=await communicationActor();if(!actor)return Response.json({message:'دوباره وارد شوید.'},{status:401});
 const [unread,items]=await Promise.all([
  prisma.notification.count({where:{userId:actor.userId,readAt:null}}),
  prisma.notification.findMany({where:{userId:actor.userId},orderBy:[{createdAt:'desc'},{id:'desc'}],take:5}),
 ]);
 return Response.json({unread,items},{headers:{'Cache-Control':'private, no-store'}});
}
