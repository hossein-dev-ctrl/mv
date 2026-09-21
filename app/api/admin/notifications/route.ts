import {communicationActor,communicationError,sendAnnouncement} from '@/lib/communication';
export async function POST(request:Request){
 const actor=await communicationActor();if(!actor)return Response.json({message:'دوباره وارد شوید.'},{status:401});
 try{const result=await sendAnnouncement(actor,await request.json().catch(()=>null));return Response.json({count:result.recipientCount});}catch(error){return communicationError(error);}
}
