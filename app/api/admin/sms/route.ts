import {adminRequest} from '@/lib/admin-request';
import {createCampaign,processCampaign} from '@/lib/manual-sms';
import {prisma} from '@/lib/prisma';
export const maxDuration=60;
export async function POST(request:Request){
 let actor;try{actor=await adminRequest(request);}catch{return Response.json({message:'دسترسی ندارید.'},{status:403});}
 try{const body=await request.json();
  if(body.campaignId){if(typeof body.campaignId!=='string'||body.campaignId.length>100)throw Error('شناسه نامعتبر');
   if(body.retryId){if(body.confirmRetry!==true||typeof body.retryId!=='string')throw Error('تأیید تلاش مجدد لازم است.');await prisma.smsDelivery.updateMany({where:{id:body.retryId,campaignId:body.campaignId,status:{in:['FAILED','UNKNOWN']}},data:{status:'PENDING'}});}
   return Response.json(await processCampaign(body.campaignId));}
  const campaign=await createCampaign(actor.userId,body);return Response.json({id:campaign.id});
 }catch(e){return Response.json({message:e instanceof Error?e.message:'خطا در پیامک'},{status:400});}
}
