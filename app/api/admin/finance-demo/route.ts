import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createFinanceDemo,clearFinanceDemo,demoEnabled } from '@/lib/finance-demo';
export async function POST(request:Request) {
 if(!demoEnabled())return Response.json({message:'این قابلیت فقط در محیط توسعه فعال است.'},{status:404});
 const session=await getSession();if(!session)return Response.json({message:'وارد شوید.'},{status:401});
 const user=await prisma.user.findUnique({where:{id:session.userId},select:{role:true}});
 if(session.role!=='ADMIN'||user?.role!=='ADMIN')return Response.json({message:'فقط مدیر مجاز است.'},{status:403});
 try {const body=await request.json();
  if(body.action==='create')return Response.json(await createFinanceDemo(session.userId));
  if(body.action==='clear')return Response.json({message:await clearFinanceDemo(session.userId)});
  return Response.json({message:'عملیات نامعتبر است.'},{status:400});
 }catch(error){return Response.json({message:error instanceof Error?error.message:'عملیات انجام نشد.'},{status:409});}
}
