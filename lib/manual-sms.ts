import {z} from 'zod';
import {prisma} from '@/lib/prisma';
import {normalizePhone} from '@/lib/otp-policy';
import {sendSms} from '@/lib/sms';
export const smsInput=z.object({requestId:z.string().uuid(),audience:z.enum(['ALL','STUDENT','TEACHER']),message:z.string().trim().max(1500),patternCode:z.string().trim().max(100).optional(),variables:z.record(z.string().max(50),z.string().max(200)).default({})}).refine(v=>v.patternCode||v.message.length>0,{message:'متن پیام یا کد پترن لازم است.'});
export async function createCampaign(senderId:string,raw:unknown){
 const input=smsInput.parse(raw);
 return prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`sms:${input.requestId}`})::bigint)`;
  const prior=await tx.smsCampaign.findUnique({where:{id:input.requestId}});if(prior){if(prior.senderId!==senderId||prior.audience!==input.audience||prior.message!==input.message||prior.patternCode!==(input.patternCode||null)||JSON.stringify(prior.variables)!==JSON.stringify(input.variables))throw Error('درخواست قبلی با همین شناسه ثبت شده؛ صفحه را تازه کنید و تاریخچه را بررسی کنید.');return prior;}
  const users=await tx.user.findMany({where:{demoBatchId:null,phone:{not:null},...(input.audience==='ALL'?{}:{role:input.audience})},select:{phone:true}});
  const phones=new Set<string>();for(const u of users){try{phones.add(normalizePhone(u.phone));}catch{}}
  if(!phones.size)throw Error('شمارهٔ معتبر برای این گروه وجود ندارد.');
  const campaign=await tx.smsCampaign.create({data:{id:input.requestId,senderId,audience:input.audience,message:input.message,patternCode:input.patternCode||null,variables:input.variables}});
  const list=[...phones];for(let i=0;i<list.length;i+=500)await tx.smsDelivery.createMany({data:list.slice(i,i+500).map(phone=>({campaignId:campaign.id,phone}))});
  return campaign;
 },{timeout:30000});
}
// Only called by an explicit administrator request, no scheduler or background hook.
export async function processCampaign(id:string){
 if(!process.env.FARAZ_SMS_API_KEY||!process.env.FARAZ_SMS_LINE_NUMBER)return {configured:false,processed:0};
 const campaign=await prisma.smsCampaign.findUniqueOrThrow({where:{id}});
 await prisma.smsDelivery.updateMany({where:{campaignId:id,status:'SENDING',claimedAt:{lt:new Date(Date.now()-300000)}},data:{status:'UNKNOWN'}});
 let processed=0;
 for(let n=0;n<3;n++){
  const job=await prisma.$transaction(async tx=>{
   const rows=await tx.$queryRaw<{id:string}[]>`SELECT id FROM "SmsDelivery" WHERE "campaignId"=${id} AND status='PENDING' ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1`;
   return rows.length?tx.smsDelivery.update({where:{id:rows[0].id},data:{status:'SENDING',claimedAt:new Date()}}):null;
  });
  if(!job)break;
  let status='UNKNOWN';
  try{const result=await sendSms(campaign.patternCode?{type:'pattern',phone:job.phone,patternCode:campaign.patternCode,variables:campaign.variables as Record<string,string>}:{type:'simple',phone:job.phone,message:campaign.message});status=String(result.status).toLowerCase()==='success'?'SENT':'FAILED';}catch{}
  await prisma.smsDelivery.update({where:{id:job.id},data:{status,...(status==='SENT'?{sentAt:new Date()}:{})}});processed++;
 }
 return {configured:true,processed};
}
