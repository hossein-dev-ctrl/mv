import {communicationActor,ticketScope} from '@/lib/communication';
import {prisma} from '@/lib/prisma';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{attachmentId:string}>}){
 const actor=await communicationActor();if(!actor)return Response.json({message:'ابتدا وارد حساب شوید.'},{status:401});
 const {attachmentId}=await params;
 const file=await prisma.ticketAttachment.findFirst({where:{id:attachmentId,message:{ticket:ticketScope(actor)}}});
 if(!file)return Response.json({message:'فایل پیدا نشد.'},{status:404});
 return new Response(new Uint8Array(file.data),{headers:{
  'Content-Type':file.contentType,'Content-Length':String(file.size),
  'Content-Disposition':`attachment; filename="attachment.${file.filename.split('.').pop()?.replace(/[^a-z0-9]/gi,'')||'bin'}"; filename*=UTF-8''${encodeURIComponent(file.filename).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16))}`,
  'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',
  'Content-Security-Policy':"sandbox; default-src 'none'",
 }});
}
