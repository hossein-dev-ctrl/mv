import {Prisma} from '@prisma/client';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {prisma} from '@/lib/prisma';
import {getManagementSession} from '@/lib/management-session';
import {notifyAdmins,notifyUsers} from '@/lib/notifications';

export type Actor={userId:string;role:'STUDENT'|'TEACHER'|'ADMIN'};
export class CommunicationError extends Error {constructor(message:string,public status=400){super(message);}}
export async function communicationActor(){
 const actor=await getManagementSession();if(!actor)return null;
 const user=await prisma.user.findUnique({where:{id:actor.userId},select:{demoBatchId:true}});
 // Finance demo accounts are disposable and must not create permanent conversations.
 return !user||user.demoBatchId?null:actor;
}
export function communicationError(error:unknown){
 if(error instanceof CommunicationError)return Response.json({message:error.message},{status:error.status});
 if(error instanceof z.ZodError)return Response.json({message:'اطلاعات فرم را بررسی کنید؛ عنوان و متن نباید خالی یا بیش از حد طولانی باشند.'},{status:400});
 if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2002')return Response.json({message:'درخواست قبلاً ثبت شده؛ صفحه را تازه کنید.'},{status:409});
 console.error('COMMUNICATION_ERROR',error);
 return Response.json({message:'ثبت انجام نشد. دوباره تلاش کنید.'},{status:500});
}
export function ticketScope(actor:Actor):Prisma.TicketWhereInput {
 return actor.role==='ADMIN'?{}:{OR:[{creatorId:actor.userId},{recipientId:actor.userId}]};
}
export function contactScope(actor:Actor):Prisma.UserWhereInput {
 const common:Prisma.UserWhereInput={id:{not:actor.userId},demoBatchId:null};
 if(actor.role==='ADMIN')return common;
 if(actor.role==='STUDENT')return {...common,role:'TEACHER'};
 return {...common,role:'STUDENT',enrollments:{some:{status:{in:['ACTIVE','COMPLETED']},course:{teacherId:actor.userId}}}};
}
const requestId=z.string().uuid();
export const newTicketInput=z.object({subject:z.string().trim().min(3).max(150),body:z.string().trim().min(3).max(6000),recipientId:z.string().max(100).nullable(),requestId});
export const replyInput=z.object({body:z.string().trim().min(1).max(6000),requestId});
export const statusInput=z.object({status:z.enum(['OPEN','CLOSED'])});
export const dispatchInput=z.object({title:z.string().trim().min(3).max(150),body:z.string().trim().min(3).max(3000),audience:z.enum(['ALL','STUDENT','TEACHER','COURSE','USER']),targetId:z.string().max(100).optional(),requestId});

async function notifyTicket(tx:Prisma.TransactionClient,ticket:{id:string;creatorId:string;recipientId:string|null;subject:string},actor:Actor,eventKey:string,title:string){
 const notice={title,body:ticket.subject,href:`/tickets/${ticket.id}`,eventKey};
 await notifyUsers(tx,[ticket.creatorId,ticket.recipientId].filter((id):id is string=>!!id&&id!==actor.userId),notice);
 // Managers oversee tickets; duplicates are suppressed for a manager participant.
 await notifyAdmins(tx,notice,actor.userId);
}
export async function createTicket(actor:Actor,raw:unknown){
 const input=newTicketInput.parse(raw);
 return prisma.$transaction(async tx=>{
  const prior=await tx.ticket.findUnique({where:{creatorId_clientRequestId:{creatorId:actor.userId,clientRequestId:input.requestId}}});
  if(prior)return prior;
  if(input.recipientId){
   const recipient=await tx.user.findFirst({where:{AND:[contactScope(actor),{id:input.recipientId}]},select:{id:true}});
   if(!recipient)throw new CommunicationError('گیرنده در دسترس شما نیست.',403);
  }else if(actor.role==='ADMIN')throw new CommunicationError('گیرنده را انتخاب کنید.');
  const ticket=await tx.ticket.create({data:{creatorId:actor.userId,recipientId:input.recipientId,subject:input.subject,clientRequestId:input.requestId,messages:{create:{senderId:actor.userId,body:input.body,clientRequestId:input.requestId}}}});
  await notifyTicket(tx,ticket,actor,`ticket:${ticket.id}:created`,'تیکت جدید');
  return ticket;
 });
}
export async function replyTicket(actor:Actor,id:string,raw:unknown){
 const input=replyInput.parse(raw);
 return prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id=${id} FOR UPDATE`;
  const ticket=await tx.ticket.findFirst({where:{id,...ticketScope(actor)}});
  if(!ticket)throw new CommunicationError('تیکت پیدا نشد.',404);
  const prior=await tx.ticketMessage.findUnique({where:{ticketId_senderId_clientRequestId:{ticketId:id,senderId:actor.userId,clientRequestId:input.requestId}}});
  if(prior)return prior;
  if(ticket.status==='CLOSED')throw new CommunicationError('برای پاسخ، ابتدا تیکت را بازگشایی کنید.',409);
  const message=await tx.ticketMessage.create({data:{ticketId:id,senderId:actor.userId,body:input.body,clientRequestId:input.requestId}});
  await tx.ticket.update({where:{id},data:{updatedAt:new Date()}});
  await notifyTicket(tx,ticket,actor,`ticket-message:${message.id}`,'پاسخ جدید تیکت');
  return message;
 });
}
export async function setTicketStatus(actor:Actor,id:string,raw:unknown){
 const {status}=statusInput.parse(raw);
 return prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id=${id} FOR UPDATE`;
  const ticket=await tx.ticket.findFirst({where:{id,...ticketScope(actor)}});
  if(!ticket)throw new CommunicationError('تیکت پیدا نشد.',404);
  if(ticket.status===status)return ticket;
  const updated=await tx.ticket.update({where:{id},data:{status}});
  await notifyTicket(tx,ticket,actor,`ticket:${id}:status:${randomUUID()}`,status==='CLOSED'?'تیکت بسته شد':'تیکت بازگشایی شد');
  return updated;
 });
}
export async function sendAnnouncement(actor:Actor,raw:unknown){
 if(actor.role!=='ADMIN')throw new CommunicationError('فقط مدیر اجازهٔ ارسال اعلان دارد.',403);
 const input=dispatchInput.parse(raw);
 return prisma.$transaction(async tx=>{
  const previous=await tx.notificationDispatch.findUnique({where:{id:input.requestId}});
  if(previous){if(previous.senderId!==actor.userId)throw new CommunicationError('شناسه درخواست تکراری است.',409);return previous;}
  const where:Prisma.UserWhereInput={demoBatchId:null};
  if(input.audience==='STUDENT'||input.audience==='TEACHER')where.role=input.audience;
  if(input.audience==='USER'){
   if(!input.targetId)throw new CommunicationError('کاربر را انتخاب کنید.');
   where.id=input.targetId;
  }
  if(input.audience==='COURSE'){
   if(!input.targetId)throw new CommunicationError('دوره را انتخاب کنید.');
   const course=await tx.course.findFirst({where:{id:input.targetId,demoBatchId:null},select:{id:true}});
   if(!course)throw new CommunicationError('دوره پیدا نشد.');
   where.enrollments={some:{courseId:course.id,status:{in:['ACTIVE','COMPLETED']}}};
  }
  const users=await tx.user.findMany({where,select:{id:true}});
  if(!users.length)throw new CommunicationError('گیرنده‌ای برای این انتخاب پیدا نشد.');
  const dispatch=await tx.notificationDispatch.create({data:{id:input.requestId,senderId:actor.userId,title:input.title,body:input.body,audience:input.audience,targetId:input.targetId||null,recipientCount:users.length}});
  await notifyUsers(tx,users.map(u=>u.id),{title:input.title,body:input.body,href:'/notifications',eventKey:`announcement:${dispatch.id}`});
  return dispatch;
 },{timeout:30000});
}
export function pageNumber(value:unknown){const n=Number(value);return Number.isSafeInteger(n)&&n>0?Math.min(n,100000):1;}
export function userLabel(user:{name:string|null;id:string;role:string}){return user.name?.trim()||`کاربر ${user.id.slice(-6)}`;}
export const roleLabels:Record<string,string>={STUDENT:'دانش‌آموز',TEACHER:'مدرس',ADMIN:'مدیر'};
