import {NextRequest,NextResponse} from 'next/server';
import {requestOtp} from '@/lib/login-otp';
export async function POST(request:NextRequest){
 if(request.headers.get('origin')!==request.nextUrl.origin)return NextResponse.json({message:'درخواست نامعتبر.'},{status:403});
 try{
  const {phone}=await request.json();
  // Set only to a header overwritten by YOUR trusted reverse proxy. Never trust arbitrary X-Forwarded-For.
  const header=process.env.OTP_TRUSTED_IP_HEADER;
  const key=header?request.headers.get(header)?.split(',')[0]?.trim()||'global':'global';
  const result=await requestOtp(phone,key);
  const response=NextResponse.json({expiresAt:result.expiresAt});
  response.headers.set('Cache-Control','no-store');
  response.cookies.set('login_challenge',result.challengeId,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/api/auth/otp',maxAge:300});
  return response;
 }catch(e){return NextResponse.json({message:e instanceof Error?e.message:'ارسال کد انجام نشد.'},{status:400});}
}
