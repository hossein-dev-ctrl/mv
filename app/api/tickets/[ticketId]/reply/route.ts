import {communicationActor,communicationError,replyTicket} from '@/lib/communication';
export async function POST(request:Request,{params}:{params:Promise<{ticketId:string}>}){
 const actor=await communicationActor();if(!actor)return Response.json({message:'دوباره وارد حساب شوید.'},{status:401});
 try{const reply=await replyTicket(actor,(await params).ticketId,await request.json().catch(()=>null));return Response.json({id:reply.id},{status:201});}catch(error){return communicationError(error);}
}
