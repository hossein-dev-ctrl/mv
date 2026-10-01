import {NextRequest,NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {createSession} from '@/lib/auth';
import {devTestingEnabled} from '@/lib/dev-test-policy';
import {devTestOwner,createTestScenario} from '@/lib/dev-test-accounts';
export async function POST(request:NextRequest){
 if(!devTestingEnabled())return NextResponse.json({message:'این ابزار فعال نیست.'},{status:404});
 if(request.headers.get('origin')!==request.nextUrl.origin)return NextResponse.json({message:'درخواست نامعتبر'},{status:403});
 const owner=await devTestOwner();if(!owner)return NextResponse.json({message:'ابتدا با حساب مدیر واقعی وارد شوید.'},{status:403});
 try{
  const body=await request.json();
  if(body.action==='create'){await createTestScenario(owner.id);return NextResponse.json({message:'دو مدرس، دو دانش‌آموز و دو دورهٔ آزمایشی آماده شد.'});}
  const options={httpOnly:true,sameSite:'strict' as const,secure:request.nextUrl.protocol==='https:',path:'/'};
  if(body.action==='restore'){const response=NextResponse.json({redirect:'/admin/testing'});response.cookies.set('session',owner.token,{...options,maxAge:604800});response.cookies.set('dev_test_admin','',{...options,maxAge:0});response.headers.set('Cache-Control','no-store');return response;}
  if(body.action!=='switch'||typeof body.userId!=='string')return NextResponse.json({message:'انتخاب نامعتبر'},{status:400});
  const target=await prisma.user.findFirst({where:{id:body.userId,testOwnerId:owner.id,role:{in:['TEACHER','STUDENT']},demoBatchId:null}});if(!target)return NextResponse.json({message:'این حساب آزمایشی متعلق به شما نیست.'},{status:403});
  const token=await createSession({userId:target.id,role:target.role,testMode:true});
  const response=NextResponse.json({redirect:target.role==='TEACHER'?'/teacher':'/dashboard'});
  response.cookies.set('dev_test_admin',owner.token,{...options,maxAge:7200});response.cookies.set('session',token,{...options,maxAge:7200});response.headers.set('Cache-Control','no-store');return response;
 }catch{return NextResponse.json({message:'عملیات انجام نشد؛ دوباره تلاش کنید.'},{status:500});}
}
