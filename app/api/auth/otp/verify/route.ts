import {NextRequest,NextResponse} from 'next/server';
import {verifyOtp} from '@/lib/login-otp';
import {createSession} from '@/lib/auth';
export async function POST(request:NextRequest){
 if(request.headers.get('origin')!==request.nextUrl.origin)return NextResponse.json({message:'درخواست نامعتبر.'},{status:403});
 try{
  const challenge=request.cookies.get('login_challenge')?.value;
  if(!challenge)return NextResponse.json({message:'دوباره شماره را وارد کنید.',restart:true},{status:400});
  const result=await verifyOtp(challenge,(await request.json()).code);
  if('error' in result)return NextResponse.json({message:result.error,restart:result.restart},{status:400});
  const token=await createSession({userId:result.user.id,role:result.user.role});
  const response=NextResponse.json({user:result.user,needsName:result.needsName});
  response.headers.set('Cache-Control','no-store');
  response.cookies.set('session',token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:604800});
  response.cookies.set('login_challenge','',{httpOnly:true,path:'/api/auth/otp',maxAge:0});
  return response;
 }catch{return NextResponse.json({message:'ورود انجام نشد؛ مجدداً تلاش کنید.'},{status:500});}
}
