import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { executeSettlement, settlementInput } from "@/lib/settlement-service";
export async function POST(request:Request) {
  const session=await getSession();
  if(!session)return Response.json({message:"ابتدا وارد شوید."},{status:401});
  const actor=await prisma.user.findUnique({where:{id:session.userId},select:{id:true,role:true}});
  if(!actor||actor.role!==session.role||actor.role==="STUDENT")return Response.json({message:"دسترسی مجاز نیست."},{status:403});
  let body;
  try {body=await request.json();} catch {return Response.json({message:"درخواست نامعتبر است."},{status:400});}
  const parsed=settlementInput.safeParse(body);
  if(!parsed.success)return Response.json({message:parsed.error.issues[0]?.message||"اطلاعات نامعتبر است."},{status:400});
  try {return Response.json({message:await executeSettlement(actor,parsed.data)});}
  catch(error) {
    const code=(error as {code?:string}).code;
    return Response.json({message:code?"عملیات ثبت نشد؛ احتمال درخواست یا شماره پیگیری تکراری وجود دارد. صفحه را تازه کنید.":error instanceof Error?error.message:"عملیات انجام نشد."},{status:409});
  }
}
