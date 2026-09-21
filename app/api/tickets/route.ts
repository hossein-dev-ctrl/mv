import {communicationActor,communicationError,createTicket} from '@/lib/communication';
export async function POST(request:Request){
 const actor=await communicationActor();if(!actor)return Response.json({message:'دوباره وارد حساب شوید.'},{status:401});
 try{const ticket=await createTicket(actor,await request.json().catch(()=>null));return Response.json({id:ticket.id},{status:201});}catch(error){return communicationError(error);}
}
