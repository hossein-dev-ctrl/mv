import {readTicketRequest} from '@/lib/ticket-attachments';
import {communicationActor,communicationError,createTicket} from '@/lib/communication';
export async function POST(request:Request){
 const actor=await communicationActor();if(!actor)return Response.json({message:'دوباره وارد حساب شوید.'},{status:401});
 try{const {payload,attachment}=await readTicketRequest(request);const ticket=await createTicket(actor,payload,attachment);return Response.json({id:ticket.id},{status:201});}catch(error){return communicationError(error);}
}
