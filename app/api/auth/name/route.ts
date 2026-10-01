import {getManagementSession} from '@/lib/management-session';
import {prisma} from '@/lib/prisma';
export async function POST(request:Request){
 const actor=await getManagementSession();if(!actor)return Response.json({message:'ابتدا وارد شوید.'},{status:401});
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({message:'درخواست نامعتبر'},{status:403});
 const {name}=await request.json().catch(()=>({}));
 if(typeof name!=='string'||name.trim().length<2||name.trim().length>80||/[\p{Cc}\p{Cf}]/u.test(name.replace(/\u200c/g,'')))return Response.json({message:'نام معتبر بین ۲ تا ۸۰ نویسه وارد کنید.'},{status:400});
 await prisma.user.updateMany({where:{id:actor.userId,OR:[{name:null},{name:''}]},data:{name:name.trim()}});
 return Response.json({success:true});
}
