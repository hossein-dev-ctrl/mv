import {communicationActor,contactScope,userLabel} from '@/lib/communication';
import {prisma} from '@/lib/prisma';
export async function GET(request:Request){
 const actor=await communicationActor();if(!actor)return Response.json({message:'دوباره وارد شوید.'},{status:401});
 const url=new URL(request.url);const q=(url.searchParams.get('q')||'').trim().slice(0,100);
 if(url.searchParams.get('kind')==='COURSE'){
  if(actor.role!=='ADMIN')return Response.json({message:'دسترسی ندارید.'},{status:403});
  const courses=await prisma.course.findMany({where:{demoBatchId:null,...(q?{title:{contains:q,mode:'insensitive'}}:{})},select:{id:true,title:true},orderBy:{title:'asc'},take:30});
  return Response.json({items:courses.map(c=>({id:c.id,label:c.title}))},{headers:{'Cache-Control':'private, no-store'}});
 }
 const users=await prisma.user.findMany({where:{...contactScope(actor),...(q?{name:{contains:q,mode:'insensitive'}}:{})},select:{id:true,name:true,role:true},orderBy:[{name:'asc'},{id:'asc'}],take:30});
 return Response.json({items:users.map(u=>({id:u.id,label:userLabel(u),role:u.role}))},{headers:{'Cache-Control':'private, no-store'}});
}
