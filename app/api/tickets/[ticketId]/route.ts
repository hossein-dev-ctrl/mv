import {communicationActor,communicationError,setTicketStatus} from '@/lib/communication';
export async function PATCH(request:Request,{params}:{params:Promise<{ticketId:string}>}){
 const actor=await communicationActor();if(!actor)return Response.json({message:'دوباره وارد حساب شوید.'},{status:401});
 try{return Response.json(await setTicketStatus(actor,(await params).ticketId,await request.json().catch(()=>null)));}catch(error){return communicationError(error);}
}
